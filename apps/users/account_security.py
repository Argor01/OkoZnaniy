"""Self-service password changes and bounded, one-use email recovery."""
from django.contrib.auth import get_user_model, password_validation, update_session_auth_hash
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import transaction
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from .password_reset import create_password_reset_code, send_password_reset_code, verify_password_reset_code, delete_password_reset_code

User = get_user_model()
GENERIC = {'message': 'Если активный аккаунт с этой почтой существует, код восстановления будет отправлен.'}


def validated_password(value, user):
    if not isinstance(value, str) or not 8 <= len(value) <= 128:
        raise ValidationError('Пароль должен содержать от 8 до 128 символов.')
    password_validation.validate_password(value, user)
    if user.check_password(value):
        raise ValidationError('Новый пароль должен отличаться от текущего.')
    return value


def password_response(user):
    # Preserve the existing cookie-auth flow with a fresh pair for this browser.
    refresh = RefreshToken.for_user(user)
    from .serializers import UserSerializer
    return Response({'message': 'Пароль изменён.', 'access': str(refresh.access_token),
                     'refresh': str(refresh), 'user': UserSerializer(user).data})


def request_reset(data, user=None):
    email = (user.email if user is not None else data.get('email')) or ''
    if not isinstance(email, str):
        return Response({'error': 'Укажите корректную почту.'}, status=400)
    email = email.strip().lower()
    try:
        validate_email(email)
    except ValidationError:
        return Response({'error': 'Для восстановления нужна действующая почта в аккаунте.'}, status=400)
    candidates = list(User.objects.filter(email__iexact=email, is_active=True)[:2])
    if len(candidates) != 1 or (user is not None and candidates[0].pk != user.pk):
        if user is not None:
            return Response({'error': 'Почта связана с несколькими аккаунтами. Обратитесь в поддержку.'}, status=400)
        return Response(GENERIC)
    candidate = candidates[0]
    code = create_password_reset_code(candidate)
    if not send_password_reset_code(candidate.email, code):
        delete_password_reset_code(email)
        if user is not None:
            return Response({'error': 'Не удалось отправить письмо. Попробуйте позже.'}, status=503)
    return Response(GENERIC if user is None else {'message': 'Код отправлен на вашу почту. Срок действия: 15 минут.'})


def confirm_reset(data, user=None):
    email = (user.email if user is not None else data.get('email')) or ''
    code = data.get('code')
    if not isinstance(email, str) or not isinstance(code, str) or len(code) != 6 or not code.isdigit():
        return Response({'error': 'Укажите почту и шестизначный код.'}, status=400)
    email = email.strip().lower()
    with transaction.atomic():
        candidates = list(User.objects.select_for_update().filter(email__iexact=email, is_active=True)[:2])
        if len(candidates) != 1:
            return Response({'error': 'Неверный или истёкший код.'}, status=400)
        candidate = candidates[0]
        if user is not None and candidate.pk != user.pk:
            return Response({'error': 'Неверный или истёкший код.'}, status=400)
        # Row lock serializes concurrent resets; the code is consumed before unlock.
        uid = verify_password_reset_code(email, code)
        if uid != candidate.pk:
            return Response({'error': 'Неверный или истёкший код.'}, status=400)
        try:
            password = validated_password(data.get('new_password'), candidate)
        except ValidationError as exc:
            return Response({'error': ' '.join(exc.messages)}, status=400)
        candidate.set_password(password)
        candidate.save(update_fields=['password'])
        delete_password_reset_code(email)
        return password_response(candidate)


class PasswordSecurityView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'password_reset'
    operation = 'change'

    def post(self, request):
        if self.operation == 'request':
            return request_reset(request.data, request.user)
        if self.operation == 'confirm':
            response = confirm_reset(request.data, request.user)
            if response.status_code == 200:
                request.user.refresh_from_db()
                update_session_auth_hash(request, request.user)
            return response
        with transaction.atomic():
            user = User.objects.select_for_update().get(pk=request.user.pk)
            old = request.data.get('current_password')
            if not isinstance(old, str) or not user.check_password(old):
                return Response({'error': 'Текущий пароль указан неверно. Можно восстановить пароль по почте.'}, status=400)
            try:
                password = validated_password(request.data.get('new_password'), user)
            except ValidationError as exc:
                return Response({'error': ' '.join(exc.messages)}, status=400)
            user.set_password(password)
            user.save(update_fields=['password'])
            if user.email:
                delete_password_reset_code(user.email.strip().lower())
            update_session_auth_hash(request, user)
            return password_response(user)
