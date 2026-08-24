from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response

from .models import IdentityVerification
from .serializers import (
    IdentityVerificationSerializer, NpdStatusCheckSerializer,
    PayoutEligibilitySerializer, RejectSerializer, VerificationSubmitSerializer,
)
from . import services


def _is_moderator(user) -> bool:
    return bool(
        getattr(user, "is_staff", False)
        or getattr(user, "role", None) in ("admin", "director")
    )


class VerificationViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["get"])
    def me(self, request):
        """Текущее состояние верификации пользователя."""
        verification = services.get_verification(request.user)
        if verification is None:
            return Response({
                "status": IdentityVerification.Status.NOT_SUBMITTED,
                "status_display": "Не подана",
                "verification": None,
            })
        return Response({
            "status": verification.status,
            "status_display": verification.get_status_display(),
            "verification": IdentityVerificationSerializer(verification).data,
        })

    @action(detail=False, methods=["post"])
    def submit(self, request):
        """Подать или переподать анкету верификации."""
        ser = VerificationSubmitSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        verification = services.submit_verification(request.user, **ser.validated_data)
        return Response(
            IdentityVerificationSerializer(verification).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["get"], url_path="payout-eligibility")
    def payout_eligibility(self, request):
        """Может ли пользователь выводить средства прямо сейчас.

        Фронт вызывает перед показом формы вывода, чтобы не вести
        пользователя в тупик.
        """
        result = services.check_payout_eligibility(request.user)
        return Response(PayoutEligibilitySerializer(result).data)

    @action(detail=False, methods=["post"], url_path="recheck-npd")
    def recheck_npd(self, request):
        """Принудительно перезапросить статус НПД у ФНС."""
        verification = services.get_verification(request.user)
        if verification is None:
            return Response({"detail": "Анкета не подана"}, status=status.HTTP_404_NOT_FOUND)
        check = services.refresh_npd_status(verification, force=True)
        if check is None:
            return Response({"detail": "Проверка НПД неприменима для вашего налогового статуса"})
        return Response(NpdStatusCheckSerializer(check).data)

    @action(detail=False, methods=["get"], url_path="npd-history")
    def npd_history(self, request):
        """Журнал проверок статуса — виден пользователю и модератору."""
        verification = services.get_verification(request.user)
        if verification is None:
            return Response([])
        qs = verification.npd_checks.all()[:50]
        return Response(NpdStatusCheckSerializer(qs, many=True).data)

    # ------------------------------------------------------------------
    # Модерация
    # ------------------------------------------------------------------

    @action(detail=False, methods=["get"], url_path="pending", permission_classes=[IsAuthenticated])
    def pending(self, request):
        """Очередь анкет на ручную проверку."""
        if not _is_moderator(request.user):
            return Response({"detail": "Недостаточно прав"}, status=status.HTTP_403_FORBIDDEN)
        qs = IdentityVerification.objects.filter(
            status=IdentityVerification.Status.PENDING,
        ).select_related("user")[:200]
        return Response(IdentityVerificationSerializer(qs, many=True).data)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        if not _is_moderator(request.user):
            return Response({"detail": "Недостаточно прав"}, status=status.HTTP_403_FORBIDDEN)
        verification = IdentityVerification.objects.filter(pk=pk).first()
        if verification is None:
            return Response({"detail": "Не найдено"}, status=status.HTTP_404_NOT_FOUND)
        services.approve(verification, reviewer=request.user)
        return Response(IdentityVerificationSerializer(verification).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        if not _is_moderator(request.user):
            return Response({"detail": "Недостаточно прав"}, status=status.HTTP_403_FORBIDDEN)
        verification = IdentityVerification.objects.filter(pk=pk).first()
        if verification is None:
            return Response({"detail": "Не найдено"}, status=status.HTTP_404_NOT_FOUND)
        ser = RejectSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        services.reject(verification, reviewer=request.user, reason=ser.validated_data["reason"])
        return Response(IdentityVerificationSerializer(verification).data)
