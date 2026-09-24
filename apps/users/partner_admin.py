"""Admin-only partner reporting. Periods refer to earning dates, not registration."""
from datetime import date, datetime, time, timedelta
from decimal import Decimal
import re

from django.db.models import Sum, Q
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from .models import User, PartnerEarning


def manager_data(manager):
    if manager is None:
        return None
    return {
        'id': manager.pk,
        'name': manager.get_full_name().strip() or manager.username or manager.email or str(manager.pk),
        'email': manager.email or '',
        'is_active': manager.is_active,
        'role': manager.role,
    }


def validate_manager(partner, raw_id):
    if partner.role != 'partner':
        raise ValidationError({'partner_manager_id': 'Менеджера можно назначить только партнеру.'})
    if raw_id is None:
        return None
    if isinstance(raw_id, bool) or not re.fullmatch(r'[1-9][0-9]*', str(raw_id)):
        raise ValidationError({'partner_manager_id': 'Укажите администратора из списка.'})
    manager = User.objects.filter(pk=int(raw_id), role='admin', is_active=True).first()
    if manager is None:
        raise ValidationError({'partner_manager_id': 'Выберите активного пользователя с ролью администратора.'})
    return manager


def period_bounds(params):
    parsed = {}
    for key in ('start_date', 'end_date'):
        raw = params.get(key)
        if not raw:
            parsed[key] = None
            continue
        try:
            if not re.fullmatch(r'[0-9]{4}-[0-9]{2}-[0-9]{2}', raw):
                raise ValueError()
            parsed[key] = date.fromisoformat(raw)
        except (ValueError, TypeError):
            raise ValidationError({key: 'Укажите дату в формате ГГГГ-ММ-ДД.'})
    start, end = parsed['start_date'], parsed['end_date']
    if start and end and start > end:
        raise ValidationError({'end_date': 'Конец периода не может быть раньше начала.'})
    try:
        tz = timezone.get_default_timezone()
        lower = timezone.make_aware(datetime.combine(start, time.min), tz) if start else None
        upper = timezone.make_aware(datetime.combine(end + timedelta(days=1), time.min), tz) if end else None
    except (ValueError, OverflowError):
        raise ValidationError({'end_date': 'Укажите допустимый период.'})
    return lower, upper


def partner_rows(view, request):
    lower, upper = period_bounds(request.query_params)
    partners = list(User.objects.filter(role='partner').select_related('partner_manager').order_by('-date_joined'))
    earnings = PartnerEarning.objects.filter(partner__role='partner')
    if lower is not None:
        earnings = earnings.filter(created_at__gte=lower)
    if upper is not None:
        earnings = earnings.filter(created_at__lt=upper)
    totals = {row['partner_id']: row for row in earnings.values('partner_id').annotate(
        total_turnover=Sum('source_amount'), total_earnings=Sum('amount'),
        paid_earnings=Sum('amount', filter=Q(is_paid=True)),
        unpaid_earnings=Sum('amount', filter=Q(is_paid=False)),
    )}
    data = list(view.get_serializer(partners, many=True).data)
    for row, partner in zip(data, partners):
        amounts = totals.get(partner.pk, {})
        for key in ('total_turnover', 'total_earnings', 'paid_earnings', 'unpaid_earnings'):
            row[key] = float(amounts.get(key) or Decimal('0'))
        row['manager'] = manager_data(partner.partner_manager)
    return data
