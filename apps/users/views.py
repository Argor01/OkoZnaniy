from django.shortcuts import render
from django.contrib.auth import get_user_model
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
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
    CustomTokenObtainPairSerializer
)

User = get_user_model()

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

@method_decorator(csrf_exempt, name='dispatch')
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        return UserSerializer

    def get_permissions(self):
        if self.action in ['create', 'reset_password', 'reset_password_confirm']:
            return [permissions.AllowAny()]
        if self.action == 'retrieve':
            return [permissions.AllowAny()]  # Публичный доступ к профилям
        return super().get_permissions()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            # Возвращаем сведения о пользователе после регистрации
            return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
        # Логируем ошибки валидации для дебага 400 ошибок
        try:
            print("[User Registration] validation errors:", serializer.errors)
        except Exception:
            pass
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def reset_password(self, request):
        serializer = PasswordResetSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            try:
                user = User.objects.get(email=email)
                token = default_token_generator.make_token(user)
                uid = urlsafe_base64_encode(force_bytes(user.pk))
                
                # Формируем ссылку для сброса пароля
                reset_url = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}/"
                
                # Отправляем email
                context = {
                    'user': user,
                    'reset_url': reset_url
                }
                message = render_to_string('users/password_reset_email.html', context)
                send_mail(
                    'Сброс пароля',
                    message,
                    settings.DEFAULT_FROM_EMAIL,
                    [email],
                    fail_silently=False,
                )
                
                return Response(
                    {"detail": "Инструкции по сбросу пароля отправлены на email."},
                    status=status.HTTP_200_OK
                )
            except User.DoesNotExist:
                pass
            
            return Response(
                {"detail": "Если указанный email существует, инструкции по сбросу пароля будут отправлены."},
                status=status.HTTP_200_OK
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def reset_password_confirm(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        if serializer.is_valid():
            try:
                uid = force_str(urlsafe_base64_decode(serializer.validated_data['uid']))
                user = User.objects.get(pk=uid)
                
                if default_token_generator.check_token(user, serializer.validated_data['token']):
                    user.set_password(serializer.validated_data['new_password'])
                    user.save()
                    return Response(
                        {"detail": "Пароль успешно изменен."},
                        status=status.HTTP_200_OK
                    )
                
            except (TypeError, ValueError, OverflowError, User.DoesNotExist):
                pass
            
            return Response(
                {"detail": "Неверная ссылка для сброса пароля."},
                status=status.HTTP_400_BAD_REQUEST
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

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
        Получение всех заказов клиента с фильтрацией
        """
        user = request.user
        if user.role != 'client':
            return Response(
                {'error': 'Доступно только для клиентов'},
                status=status.HTTP_403_FORBIDDEN
            )
        
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
