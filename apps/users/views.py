from django.shortcuts import render
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.db import models
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.http import Http404
import logging

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.utils.dateparse import parse_datetime

logger = logging.getLogger(__name__)
from apps.orders.models import Order, Transaction
from .models import PartnerEarning, ImprovementSuggestion
from apps.orders.serializers import OrderSerializer, TransactionSerializer
from .serializers import (
    UserSerializer, UserCreateSerializer, UserUpdateSerializer,
    PasswordResetSerializer, PasswordResetConfirmSerializer,
    CustomTokenObtainPairSerializer, ExpertApplicationSerializer,
    SimpleUserSerializer, PublicUserProfileSerializer,
    ImprovementSuggestionCreateSerializer, ImprovementSuggestionListSerializer
)
from .telegram_auth import verify_telegram_auth, get_or_create_telegram_user, generate_tokens_for_user
from .email_verification import create_verification_code, send_verification_code, verify_code, resend_verification_code
from .password_reset import create_password_reset_code, send_password_reset_code, verify_password_reset_code, delete_password_reset_code

User = get_user_model()

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    
    def post(self, request, *args, **kwargs):
        import logging
        from django.conf import settings
        from django.utils import timezone
        logger = logging.getLogger(__name__)
        try:
            if settings.DEBUG:
                logger.debug("[Token View] Login request received")
            
            response = super().post(request, *args, **kwargs)
            
            if response.status_code == 200:
                username = request.data.get('username')
                if username:
                    try:
                        user = User.objects.get(username=username)
                        user.unblock_if_expired()
                        user.last_login = timezone.now()
                        user.save(update_fields=['last_login'])
                        if settings.DEBUG:
                            logger.debug(f"[Token View] Updated last_login for user_id: {user.id}")
                    except User.DoesNotExist:
                        pass
            
            return response
        except Exception as e:
            logger.error(f"[Token View] Error in post: {str(e)}")
            raise

@method_decorator(csrf_exempt, name='dispatch')
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'username'
    # Разрешаем в URL любые символы кроме слэша: никнеймы могут содержать
    # точки/пробелы, а из карточки заказа также может прилетать числовой id.
    lookup_value_regex = '[^/]+'

    def get_object(self):
        """Ищем пользователя и по username, и по числовому id.

        Фронтенд иногда открывает профиль как ``/user/<id>`` из карточки
        заказа, а иногда как ``/user/<username>`` из чата/списков. Базовый
        lookup по ``username`` в этом случае падает на 404. Расширяем
        стандартный ``get_object`` так, чтобы оба варианта отрабатывали.
        """
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        lookup_value = self.kwargs.get(lookup_url_kwarg)
        if lookup_value is not None and str(lookup_value).isdigit():
            queryset = self.filter_queryset(self.get_queryset())
            try:
                obj = queryset.get(pk=int(lookup_value))
            except User.DoesNotExist:
                obj = None
            if obj is not None:
                self.check_object_permissions(self.request, obj)
                return obj
        return super().get_object()

    def get_serializer_class(self):
        if self.action == 'create':
            from .serializers import CustomRegisterSerializer
            return CustomRegisterSerializer
        elif self.action == 'retrieve':
            return PublicUserProfileSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        return UserSerializer

    def get_permissions(self):
        if self.action in ['create', 'request_password_reset', 'reset_password_with_code', 'public_stats']:
            return [permissions.AllowAny()]
        if self.action == 'retrieve':
            return [permissions.AllowAny()]  # Публичный доступ к профилям
        return super().get_permissions()

    def create(self, request, *args, **kwargs):
        email = request.data.get('email')
        
        # Проверяем, существует ли пользователь с таким email
        if email:
            try:
                existing_user = User.objects.get(email=email)
                
                # Если email не подтвержден, отправляем код повторно
                if not existing_user.email_verified:
                    verification_code = create_verification_code(existing_user)
                    send_verification_code(existing_user.email, verification_code.code)
                    
                    response_data = UserSerializer(existing_user).data
                    response_data['message'] = 'Код подтверждения отправлен повторно на ваш email.'
                    response_data['email_verification_required'] = True
                    
                    return Response(response_data, status=status.HTTP_200_OK)
                else:
                    # Email уже подтвержден
                    return Response(
                        {'email': ['Пользователь с таким email уже существует и подтвержден.']},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            except User.DoesNotExist:
                pass  # Пользователь не существует, продолжаем регистрацию
        
        serializer = self.get_serializer(data=request.data)
        
        # Логируем входящие данные для отладки
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"[Registration] Incoming data: {request.data}")
        
        if serializer.is_valid():
            user = serializer.save()
            logger.info(f"[Registration] User created: {user.id}, email: {user.email}")
            
            # Если указан email, отправляем код подтверждения
            if user.email:
                logger.info(f"[Registration] Sending verification code to {user.email}")
                verification_code = create_verification_code(user)
                send_result = send_verification_code(user.email, verification_code.code)
                logger.info(f"[Registration] Email send result: {send_result}")
                
                if not send_result:
                    logger.error(f"[Registration] Failed to send verification code to {user.email}")
                    response_data = UserSerializer(user).data
                    response_data['message'] = 'Регистрация успешна, но не удалось отправить код подтверждения. Попробуйте позже или обратитесь в поддержку.'
                    response_data['email_verification_required'] = True
                    return Response(response_data, status=status.HTTP_201_CREATED)
            else:
                logger.warning(f"[Registration] User created without email: {user.id}")
            
            # Возвращаем сведения о пользователе после регистрации
            response_data = UserSerializer(user).data
            response_data['message'] = 'Регистрация успешна. Код подтверждения отправлен на ваш email.' if user.email else 'Регистрация успешна.'
            response_data['email_verification_required'] = bool(user.email and not user.email_verified)
            
            return Response(response_data, status=status.HTTP_201_CREATED)
        # Логируем ошибки валидации для дебага 400 ошибок
        logger.error(f"[Registration] Validation errors: {serializer.errors}")
        try:
            print("[User Registration] validation errors:", serializer.errors)
        except Exception:
            pass
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def support_user(self, request):
        qs = User.objects.filter(is_active=True)
        support = qs.filter(is_staff=True, username__iexact='support').first()
        if not support:
            support = qs.filter(is_staff=True, username__iexact='administrator').first() or qs.filter(
                is_staff=True, username__iexact='admin'
            ).first()
        if not support:
            support = qs.filter(is_staff=True).order_by('id').first()
        if not support:
            return Response({'detail': 'Support user not configured'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'id': support.id})

    @action(detail=False, methods=['patch'], permission_classes=[permissions.IsAuthenticated])
    def update_me(self, request):
        serializer = UserUpdateSerializer(request.user, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            user = serializer.save()
            # Возвращаем обновленные данные пользователя
            return Response(UserSerializer(user).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def submit_improvement_suggestion(self, request):
        serializer = ImprovementSuggestionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        suggestion = serializer.save(user=request.user)
        return Response(ImprovementSuggestionListSerializer(suggestion, context={'request': request}).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def improvement_suggestions(self, request):
        user = request.user
        if user.role != 'director':
            return Response({'detail': 'Доступно только для директора'}, status=status.HTTP_403_FORBIDDEN)

        suggestions = ImprovementSuggestion.objects.select_related('user').all()
        page = self.paginate_queryset(suggestions)
        if page is not None:
            serializer = ImprovementSuggestionListSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)

        serializer = ImprovementSuggestionListSerializer(suggestions, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def client_dashboard(self, request):
        """
        Получение данных для клиентского кабинета
        """
        user = request.user
        if user.role != 'client':
            return Response(
                {'error': 'Доступно только для клиентов'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Получаем заказы клиента
        orders = user.client_orders.prefetch_related('bids__expert', 'files', 'comments').all()
        
        # Статистика
        statistics = {
            'total_orders': orders.count(),
            'completed_orders': orders.filter(status='completed').count(),
            'active_orders': orders.filter(status__in=['in_progress', 'review', 'revision']).count(),
            'total_spent': float(orders.filter(status='completed').aggregate(
                total=models.Sum('final_price')
            )['total'] or 0),
            'average_order_price': float(orders.filter(status='completed').aggregate(
                avg=models.Avg('final_price')
            )['avg'] or 0),
            'balance': float(user.balance),
            'frozen_balance': float(user.frozen_balance),
        }
        
        # Последние заказы
        recent_orders = orders.order_by('-created_at')[:5]
        
        # Активные заказы
        active_orders = orders.filter(status__in=['in_progress', 'review', 'revision']).order_by('deadline')
        
        return Response({
            'statistics': statistics,
            'recent_orders': OrderSerializer(recent_orders, many=True, context={'request': request}).data,
            'active_orders': OrderSerializer(active_orders, many=True, context={'request': request}).data,
        })

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def client_orders(self, request):
        """
        Получение заказов для текущего пользователя.
        - Клиенты видят все доступные заказы (новые без эксперта) + свои заказы
        - Эксперты видят только свои заказы (где они клиент или исполнитель)
        - Остальные видят только свои заказы
        """
        user = request.user
        from django.db.models import Q
        
        # Для клиентов показываем все доступные заказы + их собственные
        if getattr(user, 'role', None) == 'client':
            # Все новые заказы без эксперта (доступные для просмотра)
            available_orders = Q(status='new', expert__isnull=True)
            # Плюс все заказы пользователя (как клиента или эксперта)
            own_orders = Q(client=user) | Q(expert=user)
            orders = Order.objects.filter(available_orders | own_orders)
        else:
            # Для остальных - только свои заказы
            orders = Order.objects.filter(Q(client=user) | Q(expert=user))
        
        orders = orders.prefetch_related('bids__expert', 'files', 'comments').all()

        from datetime import timedelta
        from django.utils import timezone

        inactive_param = str(request.query_params.get('inactive', '')).strip().lower()
        inactive_requested = inactive_param in {'1', 'true', 'yes'}
        inactive_filter = models.Q(
            status='new',
            expert__isnull=True,
            created_at__lte=timezone.now() - timedelta(days=7),
        )
        if inactive_requested:
            orders = orders.filter(inactive_filter)
        else:
            orders = orders.exclude(inactive_filter)
        
        # Фильтрация по статусу
        status_filter = request.query_params.get('status')
        if status_filter:
            orders = orders.filter(status=status_filter)
        
        # Сортировка
        ordering = request.query_params.get('ordering', '-created_at')
        orders = orders.order_by(ordering)
        
        # Пагинация
        page = self.paginate_queryset(orders)
        if page is not None:
            serializer = OrderSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        
        serializer = OrderSerializer(orders, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def client_transactions(self, request):
        """
        Получение истории транзакций клиента
        """
        user = request.user
        if user.role != 'client':
            return Response(
                {'error': 'Доступно только для клиентов'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        transactions = Transaction.objects.filter(user=user).order_by('-timestamp')
        
        # Пагинация
        page = self.paginate_queryset(transactions)
        if page is not None:
            serializer = TransactionSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = TransactionSerializer(transactions, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def logout(self, request):
        try:
            refresh_token = request.data["refresh"]
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(status=status.HTTP_205_RESET_CONTENT)
        except Exception:
            return Response(status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def verify_email_code(self, request):
        """
        Подтверждение email через код
        
        Ожидает:
        {
            "email": "user@example.com",
            "code": "123456"
        }
        """
        email = request.data.get('email')
        code = request.data.get('code')
        
        if not email or not code:
            return Response(
                {'error': 'Email и код обязательны'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        success, message, user = verify_code(email, code)
        
        if success:
            # Генерируем JWT токены
            tokens = generate_tokens_for_user(user)
            
            return Response({
                'message': message,
                'access': tokens['access'],
                'refresh': tokens['refresh'],
                'user': UserSerializer(user).data
            }, status=status.HTTP_200_OK)
        else:
            return Response(
                {'error': message},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def resend_verification_code(self, request):
        """
        Повторная отправка кода подтверждения
        
        Ожидает:
        {
            "email": "user@example.com"
        }
        """
        email = request.data.get('email')
        
        if not email:
            return Response(
                {'error': 'Email обязателен'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        success, message = resend_verification_code(email)
        
        if success:
            return Response({'message': message}, status=status.HTTP_200_OK)
        else:
            return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def request_password_reset(self, request):
        """
        Запрос кода для сброса пароля
        
        Ожидает:
        {
            "email": "user@example.com"
        }
        """
        email = request.data.get('email')
        
        if not email:
            return Response(
                {'error': 'Email обязателен'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # Не раскрываем, существует ли пользователь
            return Response(
                {'message': 'Если пользователь с таким email существует, код был отправлен'},
                status=status.HTTP_200_OK
            )
        
        # Создаем и отправляем код
        code = create_password_reset_code(user)
        send_password_reset_code(email, code)
        
        return Response(
            {'message': 'Код для сброса пароля отправлен на ваш email'},
            status=status.HTTP_200_OK
        )
    
    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def reset_password_with_code(self, request):
        """
        Сброс пароля с помощью кода
        
        Ожидает:
        {
            "email": "user@example.com",
            "code": "123456",
            "new_password": "newpassword123"
        }
        """
        import logging
        logger = logging.getLogger(__name__)
        
        email = request.data.get('email')
        code = request.data.get('code')
        new_password = request.data.get('new_password')
        
        logger.info(f"🔐 Password reset request: email={email}, code={code}")
        
        if not all([email, code, new_password]):
            logger.warning("❌ Missing required fields")
            return Response(
                {'error': 'Email, код и новый пароль обязательны'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Проверяем код
        user_id = verify_password_reset_code(email, code)
        logger.info(f"🔍 Code verification result: user_id={user_id}")
        
        if not user_id:
            logger.warning(f"❌ Invalid or expired code for email: {email}")
            return Response(
                {'error': 'Неверный или истекший код'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(id=user_id)
            logger.info(f"✅ User found: {user.username}")
        except User.DoesNotExist:
            logger.error(f"❌ User not found with id: {user_id}")
            return Response(
                {'error': 'Пользователь не найден'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Устанавливаем новый пароль
        user.set_password(new_password)
        user.save()
        logger.info(f"✅ Password updated for user: {user.username}")
        
        # Удаляем код из кеша
        delete_password_reset_code(email)
        
        # Генерируем токены для автоматического входа
        refresh = RefreshToken.for_user(user)
        logger.info(f"✅ Tokens generated for user: {user.username}")
        
        return Response({
            'message': 'Пароль успешно изменен',
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def telegram_auth(self, request):
        """
        Авторизация через Telegram бота
        
        Ожидает данные от Telegram Login Widget:
        {
            "id": 123456789,
            "first_name": "John",
            "last_name": "Doe",
            "username": "johndoe",
            "photo_url": "https://...",
            "auth_date": 1234567890,
            "hash": "abc123..."
        }
        """
        telegram_data = request.data
        
        # Проверяем подлинность данных
        if not verify_telegram_auth(telegram_data):
            return Response(
                {'error': 'Неверные данные авторизации Telegram'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Получаем или создаем пользователя
        try:
            user = get_or_create_telegram_user(telegram_data)
            
            # Генерируем JWT токены
            tokens = generate_tokens_for_user(user)
            
            # Возвращаем токены и данные пользователя
            return Response({
                'access': tokens['access'],
                'refresh': tokens['refresh'],
                'user': UserSerializer(user).data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': f'Ошибка при авторизации: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def retrieve(self, request, *args, **kwargs):
        """Получить данные пользователя по username или числовому id.

        Логика поиска инкапсулирована в ``get_object`` — он умеет и в
        username, и в ``pk``. Здесь лишь нормализуем 404.
        """
        try:
            user = self.get_object()
        except Http404:
            return Response(
                {'error': 'Пользователь не найден'},
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = self.get_serializer(user)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def partner_dashboard(self, request):
        """Получение данных для партнерского кабинета"""
        user = request.user
        if user.role != 'partner':
            return Response(
                {'error': 'Доступно только для партнеров'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Статистика рефералов
        referrals = user.referrals.all()
        active_referrals = referrals.filter(
            client_orders__isnull=False
        ).distinct()
        
        # Доходы партнера
        earnings = PartnerEarning.objects.filter(partner=user)
        total_earnings = sum(earning.amount for earning in earnings)
        
        # Обновляем статистику
        user.active_referrals = active_referrals.count()
        user.total_earnings = total_earnings
        user.save()
        
        return Response({
            'partner_info': {
                'referral_code': user.referral_code,
                'commission_rate': user.partner_commission_rate,
                'total_referrals': user.total_referrals,
                'active_referrals': user.active_referrals,
                'total_earnings': user.total_earnings,
            },
            'referrals': [
                {
                    'id': ref.id,
                    'username': ref.username,
                    'email': ref.email,
                    'role': ref.role,
                    'date_joined': ref.date_joined,
                    'orders_count': ref.client_orders.count() if ref.role == 'client' else ref.expert_orders.count(),
                }
                for ref in referrals
            ],
            'recent_earnings': [
                {
                    'id': earning.id,
                    'amount': earning.amount,
                    'referral': earning.referral.username,
                    'earning_type': earning.earning_type,
                    'created_at': earning.created_at,
                    'is_paid': earning.is_paid,
                }
                for earning in earnings[:10]
            ]
        })

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def generate_referral_link(self, request):
        """Генерация реферальной ссылки"""
        user = request.user
        if user.role != 'partner':
            return Response(
                {'error': 'Доступно только для партнеров'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Если у партнера нет реферального кода, генерируем его
        if not user.referral_code:
            import uuid
            user.referral_code = str(uuid.uuid4())[:8].upper()
            user.save()
        
        # Генерируем ссылку
        base_url = request.build_absolute_uri('/')[:-1]  # Убираем последний слеш
        referral_link = f"{base_url}/?ref={user.referral_code}"
        
        return Response({
            'referral_code': user.referral_code,
            'referral_link': referral_link,
        })

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def partners_list(self, request):
        """Получение списка всех партнеров с их городами для карты"""
        user = request.user
        if user.role != 'partner':
            return Response(
                {'error': 'Доступно только для партнеров'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Получаем всех активных партнеров с указанным городом
        partners = User.objects.filter(
            role='partner',
            city__isnull=False,
            is_active=True  # Только активные партнеры
        ).exclude(city='').order_by('city', 'username')
        
        partners_data = []
        for partner in partners:
            # Подсчитываем статистику для каждого партнера
            total_referrals = partner.referrals.count()
            active_referrals = partner.referrals.filter(
                models.Q(client_orders__isnull=False) | models.Q(expert_orders__isnull=False)
            ).distinct().count()
            
            # Подсчитываем общий доход
            total_earnings = PartnerEarning.objects.filter(
                partner=partner
            ).aggregate(
                total=models.Sum('amount')
            )['total'] or 0
            
            partners_data.append({
                'id': partner.id,
                'username': partner.username,
                'email': partner.email,
                'city': partner.city,
                'phone': partner.phone,
                'role': partner.role,
                'date_joined': partner.date_joined,
                'total_referrals': total_referrals,
                'active_referrals': active_referrals,
                'total_earnings': float(total_earnings),
            })
        
        return Response(partners_data)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def admin_partners(self, request):
        """Получение списка всех партнеров для админки"""
        user = request.user
        if user.role != 'admin':
            return Response(
                {'error': 'Доступно только для администраторов'},
                status=status.HTTP_403_FORBIDDEN
            )

        partners = User.objects.filter(role='partner').order_by('-date_joined')
        serializer = self.get_serializer(partners, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def admin_earnings(self, request):
        """Получение всех начислений для админки"""
        user = request.user
        if user.role != 'admin':
            return Response(
                {'error': 'Доступно только для администраторов'},
                status=status.HTTP_403_FORBIDDEN
            )

        earnings = PartnerEarning.objects.select_related('partner', 'referral').order_by('-created_at')
        
        earnings_data = []
        for earning in earnings:
            earnings_data.append({
                'id': earning.id,
                'partner': earning.partner.username,
                'referral': earning.referral.username,
                'amount': earning.amount,
                'earning_type': earning.earning_type,
                'created_at': earning.created_at,
                'is_paid': earning.is_paid,
            })
        
        return Response(earnings_data)

    @action(detail=True, methods=['patch'], permission_classes=[permissions.IsAuthenticated])
    def admin_update_partner(self, request, pk=None):
        """Обновление партнера администратором"""
        user = request.user
        if user.role != 'admin':
            return Response(
                {'error': 'Доступно только для администраторов'},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            partner = User.objects.get(pk=pk, role='partner')
        except User.DoesNotExist:
            return Response(
                {'error': 'Партнер не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Обновляем только разрешенные поля
        allowed_fields = ['first_name', 'last_name', 'partner_commission_rate', 'is_verified']
        for field in allowed_fields:
            if field in request.data:
                setattr(partner, field, request.data[field])

        partner.save()
        serializer = self.get_serializer(partner)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def admin_mark_earning_paid(self, request):
        """Отметить начисление как выплаченное"""
        user = request.user
        if user.role != 'admin':
            return Response(
                {'error': 'Доступно только для администраторов'},
                status=status.HTTP_403_FORBIDDEN
            )

        earning_id = request.data.get('earning_id')
        if not earning_id:
            return Response(
                {'error': 'ID начисления не указан'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            earning = PartnerEarning.objects.get(id=earning_id)
            earning.is_paid = True
            earning.save()
            return Response({'message': 'Начисление отмечено как выплаченное'})
        except PartnerEarning.DoesNotExist:
            return Response(
                {'error': 'Начисление не найдено'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def admin_arbitrators(self, request):
        """Получение списка арбитров для админки"""
        user = request.user
        if user.role != 'admin':
            return Response(
                {'error': 'Доступно только для администраторов'},
                status=status.HTTP_403_FORBIDDEN
            )

        arbitrators = User.objects.filter(role='arbitrator').order_by('username')
        serializer = self.get_serializer(arbitrators, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def recent_users(self, request):
        """Получение последних активных пользователей для раздела 'Мои друзья'"""
        # Получаем последних 20 пользователей, которые заходили на сайт
        # Исключаем текущего пользователя и показываем только активных
        recent = User.objects.filter(
            is_active=True,
            last_login__isnull=False
        ).exclude(
            id=request.user.id
        ).order_by('-last_login')[:20]
        
        serializer = self.get_serializer(recent, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def submit_expert_application(self, request):
        """Подача анкеты экспертом"""
        user = request.user
        if user.role != 'expert':
            return Response(
                {'error': 'Доступно только для экспертов'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if user.has_submitted_application:
            return Response(
                {'error': 'Анкета уже подана'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from django.utils import timezone
        
        serializer = ExpertApplicationSerializer(data=request.data)
        if serializer.is_valid():
            # Обновляем данные профиля эксперта
            user.first_name = serializer.validated_data['first_name']
            user.last_name = serializer.validated_data['last_name']
            user.bio = serializer.validated_data['bio']
            user.experience_years = serializer.validated_data['experience_years']
            user.education = serializer.validated_data['education']
            if 'skills' in serializer.validated_data:
                user.skills = serializer.validated_data['skills']
            if 'portfolio_url' in serializer.validated_data:
                user.portfolio_url = serializer.validated_data['portfolio_url']
            
            # Помечаем анкету как поданную
            user.has_submitted_application = True
            user.application_submitted_at = timezone.now()
            user.save()
            
            # Возвращаем обновленный профиль
            return Response(
                UserSerializer(user).data,
                status=status.HTTP_200_OK
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def admin_all_users(self, request):
        """Получение всех пользователей для админки"""
        user = request.user
        if user.role != 'admin':
            return Response(
                {'error': 'Доступно только для администраторов'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Фильтрация по роли
        role_filter = request.query_params.get('role')
        users = User.objects.all().order_by('-date_joined')
        
        if role_filter:
            users = users.filter(role=role_filter)
        
        # Поиск
        search = request.query_params.get('search')
        if search:
            users = users.filter(
                models.Q(username__icontains=search) |
                models.Q(email__icontains=search) |
                models.Q(first_name__icontains=search) |
                models.Q(last_name__icontains=search)
            )
        
        serializer = self.get_serializer(users, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def admin_all_orders(self, request):
        """Получение всех заказов для админки"""
        user = request.user
        if user.role != 'admin':
            return Response(
                {'error': 'Доступно только для администраторов'},
                status=status.HTTP_403_FORBIDDEN
            )

        orders = Order.objects.select_related('client', 'expert').prefetch_related('bids').all().order_by('-created_at')
        
        # Фильтрация по статусу
        status_filter = request.query_params.get('status')
        if status_filter:
            orders = orders.filter(status=status_filter)
        
        serializer = OrderSerializer(orders, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['patch'], permission_classes=[permissions.IsAuthenticated])
    def admin_block_user(self, request, pk=None):
        """Блокировка пользователя администратором"""
        admin_user = request.user
        if admin_user.role != 'admin':
            return Response(
                {'error': 'Доступно только для администраторов'},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response(
                {'error': 'Пользователь не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        unblock_date = None
        unblock_date_raw = request.data.get('unblock_date')
        if isinstance(unblock_date_raw, str) and unblock_date_raw.strip():
            unblock_date = parse_datetime(unblock_date_raw.strip())
            if unblock_date is None:
                return Response({'error': 'Некорректная дата разблокировки'}, status=status.HTTP_400_BAD_REQUEST)
            if timezone.is_naive(unblock_date):
                unblock_date = timezone.make_aware(unblock_date, timezone.get_current_timezone())
            if unblock_date <= timezone.now():
                return Response({'error': 'Дата разблокировки должна быть в будущем'}, status=status.HTTP_400_BAD_REQUEST)

        user.is_active = False
        user.blocked_at = timezone.now()
        user.block_reason = (request.data.get('reason') or '').strip()
        user.unblock_date = unblock_date
        user.blocked_by = request.user
        user.save(update_fields=['is_active', 'blocked_at', 'block_reason', 'unblock_date', 'blocked_by'])
        
        return Response({
            'message': f'Пользователь {user.username} заблокирован',
            'user': self.get_serializer(user).data
        })

    @action(detail=True, methods=['patch'], permission_classes=[permissions.IsAuthenticated])
    def admin_unblock_user(self, request, pk=None):
        """Разблокировка пользователя администратором"""
        admin_user = request.user
        if admin_user.role != 'admin':
            return Response(
                {'error': 'Доступно только для администраторов'},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response(
                {'error': 'Пользователь не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        user.is_active = True
        user.blocked_at = None
        user.block_reason = ''
        user.unblock_date = None
        user.blocked_by = None
        user.save(update_fields=['is_active', 'blocked_at', 'block_reason', 'unblock_date', 'blocked_by'])
        
        return Response({
            'message': f'Пользователь {user.username} разблокирован',
            'user': self.get_serializer(user).data
        })

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def contact_banned_users(self, request):
        """Получить список пользователей, забаненных за обмен контактами"""
        if request.user.role not in ['admin', 'director']:
            return Response(
                {'error': 'Доступно только для администраторов и директоров'},
                status=status.HTTP_403_FORBIDDEN
            )

        banned_users = User.objects.filter(is_banned_for_contacts=True).select_related('banned_by')
        
        data = []
        for user in banned_users:
            data.append({
                'id': user.id,
                'username': user.username,
                'email': user.email or '',
                'first_name': user.first_name,
                'last_name': user.last_name,
                'role': user.role,
                'contact_ban_date': user.contact_ban_date,
                'contact_ban_reason': user.contact_ban_reason or '',
                'contact_violations_count': user.contact_violations_count,
                'banned_by': user.banned_by.username if user.banned_by else 'Система',
                'phone': user.phone or '',
                'telegram_id': user.telegram_id,
            })
        
        return Response(data)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def directors(self, request):
        """Получить список директоров для коммуникации"""
        directors = User.objects.filter(role='director', is_active=True)
        
        data = []
        for director in directors:
            data.append({
                'id': director.id,
                'first_name': director.first_name,
                'last_name': director.last_name,
                'email': director.email,
                'online': False,  # TODO: реализовать проверку онлайн статуса
            })
        
        return Response(data)

    def _resolve_contact_ban_user(self, pk=None, username=None):
        """Найти пользователя по числовому id или username.

        UserViewSet использует ``lookup_field='username'``, поэтому роутер
        передаёт значение из URL в kwarg ``username``. Фронтенд же
        отправляет числовой ``id`` пользователя. Этот хелпер принимает
        оба варианта и возвращает пользователя либо ``None``.
        """
        lookup = pk if pk is not None else username
        if lookup is None:
            return None
        lookup_str = str(lookup)
        try:
            if lookup_str.isdigit():
                return User.objects.get(pk=int(lookup_str))
            return User.objects.get(username=lookup_str)
        except User.DoesNotExist:
            return None

    @action(detail=True, methods=['patch'], permission_classes=[permissions.IsAuthenticated])
    def ban_for_contacts(self, request, pk=None, username=None, *args, **kwargs):
        """Забанить пользователя за обмен контактами"""
        if request.user.role not in ['admin', 'director']:
            return Response(
                {'error': 'Доступно только для администраторов и директоров'},
                status=status.HTTP_403_FORBIDDEN
            )

        user = self._resolve_contact_ban_user(pk=pk, username=username)
        if user is None:
            return Response(
                {'error': 'Пользователь не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        from django.utils import timezone
        from datetime import timedelta

        reason = request.data.get('reason', 'Обмен контактными данными в чате')
        now = timezone.now()

        days_raw = request.data.get('days')
        try:
            days = int(days_raw) if days_raw not in (None, '') else None
        except (TypeError, ValueError):
            return Response(
                {'error': 'Параметр days должен быть целым числом'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if days is not None and days <= 0:
            return Response(
                {'error': 'Параметр days должен быть положительным'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.is_banned_for_contacts = True
        user.contact_ban_reason = reason
        user.contact_ban_date = now
        user.contact_ban_until = now + timedelta(days=days) if days else None
        user.contact_violations_count += 1
        user.banned_by = request.user
        user.save()

        return Response({
            'message': (
                f'Пользователь {user.username} заблокирован на {days} дн.'
                if days else f'Пользователь {user.username} забанен за обмен контактами'
            ),
            'user': self.get_serializer(user).data
        })

    @action(detail=True, methods=['patch'], permission_classes=[permissions.IsAuthenticated])
    def unban_for_contacts(self, request, pk=None, username=None, *args, **kwargs):
        """Разбанить пользователя за обмен контактами"""
        if request.user.role not in ['admin', 'director']:
            return Response(
                {'error': 'Доступно только для администраторов и директоров'},
                status=status.HTTP_403_FORBIDDEN
            )

        user = self._resolve_contact_ban_user(pk=pk, username=username)
        if user is None:
            return Response(
                {'error': 'Пользователь не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        user.is_banned_for_contacts = False
        user.contact_ban_reason = None
        user.contact_ban_date = None
        user.contact_ban_until = None
        user.save()

        return Response({
            'message': f'Пользователь {user.username} разбанен',
            'user': self.get_serializer(user).data
        })

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def unfreeze_chats(self, request, pk=None, username=None, *args, **kwargs):
        """Разморозить все чаты пользователя"""
        if request.user.role not in ['admin', 'director']:
            return Response(
                {'error': 'Доступно только для администраторов и директоров'},
                status=status.HTTP_403_FORBIDDEN
            )

        user = self._resolve_contact_ban_user(pk=pk, username=username)
        if user is None:
            return Response(
                {'error': 'Пользователь не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Размораживаем все чаты пользователя
        from apps.chat.models import Chat
        frozen_chats = Chat.objects.filter(
            models.Q(client=user) | models.Q(expert=user),
            is_frozen=True
        )
        
        unfrozen_count = 0
        for chat in frozen_chats:
            chat.unfreeze()
            unfrozen_count += 1
        
        # Также снимаем бан с пользователя, если он забанен
        if user.is_banned_for_contacts:
            user.is_banned_for_contacts = False
            user.save()
        
        return Response({
            'message': f'Разморожено чатов: {unfrozen_count}',
            'unfrozen_count': unfrozen_count,
            'user': self.get_serializer(user).data
        })




@api_view(['GET'])
@permission_classes([AllowAny])
def public_stats_view(request):
    """
    Публичная статистика для футера
    """
    from django.utils import timezone
    from datetime import timedelta
    import logging
    logger = logging.getLogger(__name__)
    
    # Логирование для отладки
    auth_header = request.headers.get('Authorization', 'нет заголовка')
    logger.info(f"[PublicStats] Request headers - Authorization: {auth_header[:50] if auth_header and len(auth_header) > 50 else auth_header}")
    
    # Пытаемся аутентифицировать пользователя по токену вручную
    user = None
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header[7:]  # Убираем 'Bearer '
        try:
            from rest_framework_simplejwt.tokens import AccessToken
            access_token = AccessToken(token)
            user_id = access_token.payload.get('user_id')
            if user_id:
                user = User.objects.get(id=user_id)
                logger.info(f"[PublicStats] Token validated for user {user.id} ({user.username})")
        except Exception as e:
            logger.warning(f"[PublicStats] Token validation failed: {e}")
    
    # Обновляем last_login для текущего пользователя (если удалось аутентифицировать)
    if user and user.is_active:
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])
        logger.info(f"[PublicStats] Updated last_login for user {user.id} ({user.username})")
    else:
        logger.info("[PublicStats] No authenticated user - NOT updating last_login")
    
    # Общее количество пользователей (только эксперты и клиенты)
    total_experts = User.objects.filter(role='expert').count()
    total_clients = User.objects.filter(role='client').count()
    total_users = total_experts + total_clients
    
    # Новые пользователи за 24 часа (только эксперты и клиенты)
    yesterday = timezone.now() - timedelta(days=1)
    new_users_today = User.objects.filter(
        date_joined__gte=yesterday,
        role__in=['expert', 'client']
    ).count()
    
    # Заказы
    total_orders = Order.objects.count()
    completed_orders = Order.objects.filter(status='completed').count()
    
    # Заказы за 24 часа
    orders_today = Order.objects.filter(created_at__gte=yesterday).count()
    
    # Активные пользователи (за последние 15 минут)
    fifteen_minutes_ago = timezone.now() - timedelta(minutes=15)
    online_users = User.objects.filter(last_login__gte=fifteen_minutes_ago).count()
    
    # Логирование для отладки
    logger.info(f"[PublicStats] Query: last_login >= {fifteen_minutes_ago}")
    logger.info(f"[PublicStats] online_users={online_users}, total_users={total_users}")
    
    # Отладка: покажем последних 5 заходов
    recent_logins = User.objects.filter(last_login__isnull=False).order_by('-last_login')[:5]
    for u in recent_logins:
        minutes_ago = (timezone.now() - u.last_login).total_seconds() / 60
        logger.info(f"[PublicStats] Recent login: user {u.id} ({u.username}) - {minutes_ago:.1f} min ago")
    
    return Response({
        'total_experts': total_experts,
        'total_clients': total_clients,
        'total_users': total_users,
        'new_users_today': new_users_today,
        'total_orders': total_orders,
        'completed_orders': completed_orders,
        'orders_today': orders_today,
        'online_users': online_users
    })


# Telegram Auth Status Check
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from django.core.cache import cache

@api_view(['GET'])
@permission_classes([AllowAny])
def telegram_auth_status(request, auth_id):
    """Проверка статуса авторизации через Telegram"""
    print(f"🔍 API: Проверяем auth_id: {auth_id}")
    
    # Убираем префикс auth_ если он есть, так как бот уже убрал его при сохранении
    clean_auth_id = auth_id.replace('auth_', '', 1) if auth_id.startswith('auth_') else auth_id
    cache_key = f'telegram_auth_{clean_auth_id}'
    print(f"🔑 API: Cache key: {cache_key}")
    
    # Проверяем все ключи в Redis для отладки
    from django_redis import get_redis_connection
    try:
        redis_conn = get_redis_connection("default")
        all_keys = redis_conn.keys('telegram_auth_*')
        print(f"🗝️ API: Все ключи в Redis: {[k.decode() if isinstance(k, bytes) else k for k in all_keys]}")
    except Exception as e:
        print(f"❌ API: Ошибка получения ключей из Redis: {e}")
    
    auth_data = cache.get(cache_key)
    print(f"📦 API: Cache data: {auth_data}")
    
    if auth_data:
        print(f"✅ API: Возвращаем authenticated=True")
        # НЕ удаляем сразу - пусть истечет через 5 минут
        # Это позволяет фронту получить данные даже если первый запрос не сработал
        return Response(auth_data, status=status.HTTP_200_OK)
    
    print(f"❌ API: Возвращаем authenticated=False")
    return Response({'authenticated': False}, status=status.HTTP_200_OK)


# Google OAuth Callback
from django.shortcuts import redirect
from allauth.socialaccount.models import SocialAccount
from django.http import HttpResponse

def google_callback(request):
    """
    Обработка callback после авторизации через Google.
    Генерируем JWT токены и перенаправляем на фронт с токенами.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    user = request.user
    logger.info(f"🔍 google_callback: user authenticated: {user.is_authenticated}")
    
    if not user.is_authenticated:
        # Если пользователь не авторизован, перенаправляем на страницу логина
        logger.warning("❌ User not authenticated, redirecting to login")
        return redirect(f"{settings.FRONTEND_URL}/login?error=auth_failed")
    
    # Генерируем JWT токены
    refresh = RefreshToken.for_user(user)
    access_token = str(refresh.access_token)
    refresh_token = str(refresh)
    
    logger.info(f"✅ Tokens generated for user: {user.username}, role: {user.role}")
    
    # Получаем email из Google аккаунта
    try:
        social_account = SocialAccount.objects.get(user=user, provider='google')
        email = social_account.extra_data.get('email', user.email)
        
        # Обновляем email пользователя если он не был установлен
        if not user.email and email:
            user.email = email
            user.save()
    except SocialAccount.DoesNotExist:
        pass
    
    # Перенаправляем на /google-callback с токенами
    # GoogleCallback компонент обработает токены и перенаправит на нужную страницу
    redirect_url = (
        f"{settings.FRONTEND_URL}/google-callback?"
        f"access={access_token}&refresh={refresh_token}&"
        f"user_id={user.id}&username={user.username}&role={user.role}"
    )
    
    logger.info(f"🔀 Redirecting to: {redirect_url}")
    return redirect(redirect_url)


def vk_callback(request):
    """
    Обработка callback после авторизации через VK ID (MAX).
    Генерируем JWT токены и перенаправляем на фронт с токенами.
    """
    import logging
    logger = logging.getLogger(__name__)

    user = request.user
    logger.info(f"🔍 vk_callback: user authenticated: {user.is_authenticated}")

    if not user.is_authenticated:
        logger.warning("❌ VK: User not authenticated, redirecting to login")
        return redirect(f"{settings.FRONTEND_URL}/login?error=vk_auth_failed")

    refresh = RefreshToken.for_user(user)
    access_token = str(refresh.access_token)
    refresh_token = str(refresh)

    logger.info(f"✅ VK tokens generated for user: {user.username}, role: {user.role}")

    redirect_url = (
        f"{settings.FRONTEND_URL}/google-callback?"
        f"access={access_token}&refresh={refresh_token}&"
        f"user_id={user.id}&username={user.username}&role={user.role}"
    )

    logger.info(f"🔀 VK Redirecting to: {redirect_url}")
    return redirect(redirect_url)

