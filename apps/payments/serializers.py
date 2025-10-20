from rest_framework import serializers
from .models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    payment_method_display = serializers.CharField(
        source='get_payment_method_display',
        read_only=True
    )
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True
    )

    class Meta:
        model = Payment
        fields = [
            'id', 'order', 'amount', 'payment_method',
            'payment_method_display', 'status', 'status_display',
            'payment_id', 'created_at', 'updated_at',
            'paid_at', 'refunded_at', 'metadata'
        ]
        read_only_fields = [
            'payment_id', 'created_at', 'updated_at',
            'paid_at', 'refunded_at', 'status'
        ] 