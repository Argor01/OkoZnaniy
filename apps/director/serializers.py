from rest_framework import serializers
from django.contrib.auth import get_user_model
from apps.users.serializers import UserSerializer
from apps.experts.serializers import ExpertApplicationSerializer

User = get_user_model()

class DirectorStatsSerializer(serializers.Serializer):
    """Сериализатор для статистики директора"""
    total_turnover = serializers.DecimalField(max_digits=12, decimal_places=2, default=0)
    net_profit = serializers.DecimalField(max_digits=12, decimal_places=2, default=0)
    active_orders = serializers.IntegerField(default=0)
    total_clients = serializers.IntegerField(default=0)
    total_experts = serializers.IntegerField(default=0)
    total_partners = serializers.IntegerField(default=0)
    conversion_rate = serializers.FloatField(default=0)
    average_check = serializers.DecimalField(max_digits=10, decimal_places=2, default=0)

class MonthlyTurnoverSerializer(serializers.Serializer):
    """Сериализатор для месячного оборота"""
    period = serializers.CharField()
    total = serializers.DecimalField(max_digits=12, decimal_places=2)
    previous_period = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    change_percent = serializers.FloatField(required=False)
    daily_data = serializers.ListField(
        child=serializers.DictField(), required=False
    )

class NetProfitSerializer(serializers.Serializer):
    """Сериализатор для чистой прибыли"""
    total = serializers.DecimalField(max_digits=12, decimal_places=2)
    income = serializers.DecimalField(max_digits=12, decimal_places=2)
    expense = serializers.DecimalField(max_digits=12, decimal_places=2)
    previous_period = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    change_percent = serializers.FloatField(required=False)
    income_breakdown = serializers.ListField(
        child=serializers.DictField(), required=False
    )
    expense_breakdown = serializers.ListField(
        child=serializers.DictField(), required=False
    )

class PartnerSerializer(serializers.ModelSerializer):
    """Сериализатор для партнеров"""
    total_referrals = serializers.IntegerField(read_only=True)
    active_referrals = serializers.IntegerField(read_only=True)
    total_earnings = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'first_name', 'last_name', 'email', 'phone',
            'referral_code', 'partner_commission_rate', 'total_referrals',
            'active_referrals', 'total_earnings', 'is_active', 'date_joined'
        ]

class PartnerTurnoverSerializer(serializers.Serializer):
    """Сериализатор для оборота партнеров"""
    partner_id = serializers.IntegerField()
    partner_name = serializers.CharField()
    partner_email = serializers.CharField()
    referrals_count = serializers.IntegerField()
    turnover = serializers.DecimalField(max_digits=12, decimal_places=2)
    commission = serializers.DecimalField(max_digits=10, decimal_places=2)