import logging
import re
from django.conf import settings
from django.core.mail import EmailMessage, get_connection
from django.utils import timezone
from rest_framework import serializers, permissions
from rest_framework.decorators import api_view, permission_classes, throttle_classes, authentication_classes
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle
from .models import LandingInquiry

logger = logging.getLogger(__name__)
VACANCIES = ('Администратор', 'Агент по клиентскому трафику', 'Менеджер по работе с партнёрами', 'Автор студенческих работ')

class InquiryThrottle(SimpleRateThrottle):
    scope = 'landing_inquiry'
    rate = '5/hour'
    def get_cache_key(self, request, view):
        return self.cache_format % {'scope': self.scope, 'ident': self.get_ident(request)}

class InquirySerializer(serializers.Serializer):
    kind = serializers.ChoiceField(choices=['vacancy', 'agency'])
    vacancy = serializers.CharField(required=False, allow_blank=True, max_length=100, default='')
    name = serializers.CharField(max_length=120)
    phone = serializers.CharField(required=False, allow_blank=True, max_length=40, default='')
    email = serializers.EmailField(required=False, allow_blank=True, default='')
    message = serializers.CharField(required=False, allow_blank=True, max_length=3000, default='')
    consent = serializers.BooleanField()
    website = serializers.CharField(required=False, allow_blank=True, max_length=200, default='')

    def validate(self, data):
        if not data['consent']:
            raise serializers.ValidationError('Необходимо согласие на обработку персональных данных.')
        if data['website']:
            raise serializers.ValidationError('Не удалось отправить заявку.')
        if not data['phone'] and not data['email']:
            raise serializers.ValidationError('Укажите телефон или email для связи.')
        if data['phone'] and not 10 <= len(re.sub(r'\D', '', data['phone'])) <= 15:
            raise serializers.ValidationError({'phone': 'Введите корректный номер телефона.'})
        if data['kind'] == 'vacancy' and data['vacancy'] not in VACANCIES:
            raise serializers.ValidationError({'vacancy': 'Выберите вакансию из списка.'})
        data.pop('website')
        if data['kind'] == 'agency':
            data['vacancy'] = ''
        return data

@api_view(['POST'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
@throttle_classes([InquiryThrottle])
def submit_inquiry(request):
    serializer = InquirySerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    inquiry = LandingInquiry.objects.create(**serializer.validated_data)
    # Save first: a temporary SMTP failure must never lose the application.
    subject = f'Новая заявка #{inquiry.pk}: {inquiry.get_kind_display()}'
    body = '\n'.join([f'Направление: {inquiry.vacancy or "Сотрудничество с агентством"}',
        f'Имя: {inquiry.name}', f'Телефон: {inquiry.phone}', f'Email: {inquiry.email}',
        f'Комментарий: {inquiry.message}', 'Согласие на обработку данных: получено',
        f'https://okoznaniy.ru/django-admin/notifications/landinginquiry/{inquiry.pk}/change/'])
    try:
        mail = EmailMessage(subject, body, settings.DEFAULT_FROM_EMAIL,
            [getattr(settings, 'LANDING_INQUIRY_EMAIL', 'partners.okoznaniy@mail.ru')],
            reply_to=[inquiry.email] if inquiry.email else [], connection=get_connection(timeout=10))
        if mail.send():
            inquiry.emailed_at = timezone.now()
            inquiry.save(update_fields=['emailed_at'])
    except Exception:
        logger.warning('Inquiry %s saved; staff email delivery requires retry', inquiry.pk)
    return Response({'message': 'Заявка получена. Мы свяжемся с вами по указанным контактам.'}, status=201)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def list_landing_inquiries(request):
    if getattr(request.user, 'role', None) != 'director':
        return Response({'detail': '???????? ?????? ??? ?????????'}, status=403)
    qs = LandingInquiry.objects.all().order_by('-created_at')
    kind = request.query_params.get('kind')
    if kind in ('vacancy', 'agency'):
        qs = qs.filter(kind=kind)
    return Response([{
        'id': row.id, 'kind': row.kind, 'vacancy': row.vacancy, 'name': row.name,
        'phone': row.phone, 'email': row.email, 'message': row.message,
        'created_at': row.created_at.isoformat(), 'processed': row.processed,
        'source': 'landing',
    } for row in qs])
