from rest_framework import serializers

from .inn import InvalidINN, is_personal_inn, validate_inn
from .models import IdentityVerification, NpdStatusCheck


class NpdStatusCheckSerializer(serializers.ModelSerializer):
    class Meta:
        model = NpdStatusCheck
        fields = ["id", "inn", "checked_at", "is_self_employed", "message"]
        read_only_fields = fields


class IdentityVerificationSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    tax_status_display = serializers.CharField(source="get_tax_status_display", read_only=True)

    class Meta:
        model = IdentityVerification
        fields = [
            "id", "last_name", "first_name", "middle_name", "full_name",
            "birth_date", "inn", "tax_status", "tax_status_display",
            "status", "status_display", "rejection_reason",
            "npd_confirmed", "npd_checked_at", "npd_message",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "status", "status_display", "rejection_reason",
            "npd_confirmed", "npd_checked_at", "npd_message",
            "created_at", "updated_at",
        ]


class VerificationSubmitSerializer(serializers.Serializer):
    last_name = serializers.CharField(max_length=100)
    first_name = serializers.CharField(max_length=100)
    middle_name = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")
    birth_date = serializers.DateField(required=False, allow_null=True)
    inn = serializers.CharField(max_length=20)
    tax_status = serializers.ChoiceField(choices=IdentityVerification.TaxStatus.choices)

    def validate_inn(self, value):
        try:
            digits = validate_inn(value)
        except InvalidINN as e:
            raise serializers.ValidationError(str(e))
        if not is_personal_inn(digits):
            raise serializers.ValidationError(
                "Нужен ИНН физического лица или ИП — 12 цифр. Указан ИНН организации."
            )
        return digits

    def validate(self, attrs):
        for field in ("last_name", "first_name"):
            if not (attrs.get(field) or "").strip():
                raise serializers.ValidationError({field: "Поле обязательно"})
        return attrs


class PayoutEligibilitySerializer(serializers.Serializer):
    allowed = serializers.BooleanField()
    code = serializers.CharField()
    message = serializers.CharField()


class RejectSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=1000)
