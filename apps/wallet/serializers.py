from rest_framework import serializers
from apps.orders.models import Transaction


class WalletBalanceSerializer(serializers.Serializer):
    balance = serializers.DecimalField(max_digits=12, decimal_places=2)
    frozen_balance = serializers.DecimalField(max_digits=12, decimal_places=2)
    available_balance = serializers.DecimalField(max_digits=12, decimal_places=2)


class WalletStatsSerializer(serializers.Serializer):
    total_topup = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_spent = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_earned = serializers.DecimalField(max_digits=12, decimal_places=2)


class WalletTransactionSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    direction = serializers.SerializerMethodField()
    order_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = Transaction
        fields = [
            'id', 'amount', 'type', 'type_display', 'direction',
            'description', 'order_id', 'balance_after', 'timestamp',
        ]

    def get_direction(self, obj) -> str:
        income = {'topup', 'release', 'payout', 'refund'}
        return 'in' if obj.type in income else 'out'


class TopupRequestSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=100)
    payment_method = serializers.ChoiceField(
        choices=['sberpay_qr', 'sberbank', 'card', 'sbp'],
        default='sberpay_qr',
    )


import re


class WithdrawRequestSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=100)
    card_number = serializers.CharField(max_length=32)

    def validate_card_number(self, value):
        digits = re.sub(r'\D', '', value)
        if len(digits) < 16 or len(digits) > 19:
            raise serializers.ValidationError('Введите корректный номер карты')
        return digits
