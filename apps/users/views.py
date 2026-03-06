from django.shortcuts import render
from django.contrib.auth import get_user_model
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.db import models
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from apps.orders.models import Order, Transaction
from apps.orders.serializers import OrderSerializer, TransactionSerializer
from .serializers import (
    UserSerializer, UserCreateSerializer, UserUpdateSerializer,
    PasswordResetSerializer, PasswordResetConfirmSerializer,
    CustomTokenObtainPairSerializer, ExpertApplicationSerializer,
    SimpleUserSerializer
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
    
    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        elif self.action == 'retrieve':
            return SimpleUserSerializer
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
        if serializer.is_valid():
            user = serializer.save()
            
            # Если указан email, отправляем код подтверждения
            if user.email:
                verification_code = create_verification_code(user)
                send_verification_code(user.email, verification_code.code)
            
            # Возвращаем сведения о пользователе после регистрации
            response_data = UserSerializer(user).data
            response_data['message'] = 'Регистрация успешна. Код подтверждения отправлен на ваш email.' if user.email else 'Регистрация успешна.'
            response_data['email_verification_required'] = bool(user.email and not user.email_verified)
            
            return Response(response_data, status=status.HTTP_201_CREATED)
        # Логируем ошибки валидации для дебага 400 ошибок
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
        serializer = UserUpdateSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

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
        Получение заказов, размещённых текущим пользователем (где он заказчик).
        Доступно любому авторизованному пользователю — показываем заказы по полю client.
        """
        user = request.user
        orders = user.client_orders.prefetch_related('bids__expert', 'files', 'comments').all()
        
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

    def retrieve(self, request, pk=None):
        """Получить данные пользователя по ID (публичный доступ)"""
        try:
            user = User.objects.get(pk=pk)
            serializer = self.get_serializer(user)
            return Response(serializer.data)
        except User.DoesNotExist:
            return Response(
                {'error': 'Пользователь не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

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
        from .models import PartnerEarning
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

        from .models import PartnerEarning
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
            from .models import PartnerEarning
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

        user.is_active = False
        user.save()
        
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
        user.save()
        
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

    @action(detail=True, methods=['patch'], permission_classes=[permissions.IsAuthenticated])
    def ban_for_contacts(self, request, pk=None):
        """Забанить пользователя за обмен контактами"""
        if request.user.role not in ['admin', 'director']:
            return Response(
                {'error': 'Доступно только для администраторов и директоров'},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response(
                {'error': 'Пользователь не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        from django.utils import timezone
        
        reason = request.data.get('reason', 'Обмен контактными данными в чате')
        user.is_banned_for_contacts = True
        user.contact_ban_reason = reason
        user.contact_ban_date = timezone.now()
        user.contact_violations_count += 1
        user.banned_by = request.user
        user.save()
        
        return Response({
            'message': f'Пользователь {user.username} забанен за обмен контактами',
            'user': self.get_serializer(user).data
        })

    @action(detail=True, methods=['patch'], permission_classes=[permissions.IsAuthenticated])
    def unban_for_contacts(self, request, pk=None):
        """Разбанить пользователя за обмен контактами"""
        if request.user.role not in ['admin', 'director']:
            return Response(
                {'error': 'Доступно только для администраторов и директоров'},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response(
                {'error': 'Пользователь не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        user.is_banned_for_contacts = False
        user.save()
        
        return Response({
            'message': f'Пользователь {user.username} разбанен',
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

