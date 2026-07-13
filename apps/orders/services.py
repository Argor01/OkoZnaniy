from django.db.models import Sum
from django.db import models
from django.utils import timezone
from apps.catalog.models import DiscountRule
from .models import Bid, BidStatus, Order


class OrderActionService:
    """Single place for per-user order action availability."""

    CLIENT_REVIEW_STATUSES = {'review'}
    EXPERT_WORK_STATUSES = {'in_progress', 'revision'}
    CLOSED_STATUSES = {'completed', 'cancelled', 'canceled', 'done'}

    @staticmethod
    def _is_contact_banned(user) -> bool:
        if not user or not getattr(user, 'is_authenticated', False):
            return False
        if getattr(user, 'role', None) in ('admin', 'director'):
            return False
        try:
            if hasattr(user, 'is_contact_ban_active'):
                return bool(user.is_contact_ban_active())
            if hasattr(user, 'unban_for_contacts_if_expired'):
                user.unban_for_contacts_if_expired()
            return bool(getattr(user, 'is_banned_for_contacts', False))
        except Exception:
            return bool(getattr(user, 'is_banned_for_contacts', False))

    @classmethod
    def for_user(cls, order: Order, user) -> dict[str, bool]:
        is_authenticated = bool(user and getattr(user, 'is_authenticated', False))
        role = getattr(user, 'role', None) if is_authenticated else None
        is_staff = bool(is_authenticated and (getattr(user, 'is_staff', False) or role in ('admin', 'director', 'arbitrator')))
        user_id = getattr(user, 'id', None) if is_authenticated else None
        is_client = bool(user_id and order.client_id == user_id)
        is_expert = bool(user_id and order.expert_id == user_id)
        is_available_order = order.status == 'new' and order.expert_id is None
        is_contact_banned = cls._is_contact_banned(user)
        is_closed = order.status in cls.CLOSED_STATUSES

        user_bid = None
        if is_authenticated and role == 'expert':
            try:
                if hasattr(order, '_prefetched_objects_cache') and 'bids' in order._prefetched_objects_cache:
                    user_bid = next((bid for bid in order.bids.all() if bid.expert_id == user_id), None)
                else:
                    user_bid = Bid.objects.filter(order=order, expert_id=user_id).first()
            except Exception:
                user_bid = None

        has_active_bid = bool(user_bid and user_bid.status in (BidStatus.ACTIVE, BidStatus.INVITED, BidStatus.ACCEPTED))
        is_invited_expert = bool(is_expert and user_bid and user_bid.status == BidStatus.INVITED)
        deadline_is_overdue = bool(order.deadline and order.deadline <= timezone.now())

        return {
            'can_view': is_authenticated and (is_staff or is_client or is_expert or is_available_order or role == 'client'),
            'can_edit': is_client and order.status == 'new' and not order.expert_id and not is_contact_banned,
            'can_delete': is_client and order.status in ('new', 'completed') and not is_contact_banned,
            'can_bid': role == 'expert' and is_available_order and not is_client and not has_active_bid and not is_contact_banned,
            'can_cancel_bid': role == 'expert' and bool(user_bid) and user_bid.status == BidStatus.ACTIVE and order.status == 'new' and not is_contact_banned,
            'can_accept_bid': (is_client or is_staff) and order.status in ('new', 'awaiting_expert_acceptance') and not is_contact_banned,
            'can_accept_assignment': is_invited_expert and order.status == 'awaiting_expert_acceptance' and not is_contact_banned,
            'can_decline_assignment': is_invited_expert and order.status == 'awaiting_expert_acceptance' and not is_contact_banned,
            'can_upload_task_files': is_client and not is_closed and not is_contact_banned,
            'can_upload_work': is_expert and order.status in cls.EXPERT_WORK_STATUSES and not deadline_is_overdue and not is_contact_banned,
            'can_submit_work': is_expert and order.status in cls.EXPERT_WORK_STATUSES and not deadline_is_overdue and not is_contact_banned,
            'can_approve_work': is_client and order.status in cls.CLIENT_REVIEW_STATUSES and not is_contact_banned,
            'can_request_revision': is_client and order.status in cls.CLIENT_REVIEW_STATUSES and not is_contact_banned,
            'can_reject_work': is_client and order.status in cls.CLIENT_REVIEW_STATUSES and not is_contact_banned,
            'can_extend_deadline': is_client and bool(order.expert_id) and order.status in cls.EXPERT_WORK_STATUSES and deadline_is_overdue and not is_contact_banned,
            'can_cancel_overdue': is_client and bool(order.expert_id) and order.status in cls.EXPERT_WORK_STATUSES and deadline_is_overdue and not is_contact_banned,
            'can_open_dispute': is_client and order.status in ('completed', 'review') and not hasattr(order, 'dispute') and not is_contact_banned,
            'can_create_review': is_client and order.status == 'completed' and bool(order.expert_id) and not is_contact_banned,
            'can_open_order_chat': bool(order.expert_id) and (is_client or is_expert or is_staff) and not is_contact_banned,
        }

class DiscountService:
    @staticmethod
    def get_available_discounts(user):
        """
        Получает список доступных скидок для пользователя
        """
        user_orders = user.client_orders.filter(status='completed')
        total_orders = user_orders.count()
        total_spent = user_orders.aggregate(total=Sum('final_price'))['total'] or 0

        now = timezone.now()
        active_discounts = DiscountRule.objects.filter(
            is_active=True,
            valid_from__lte=now
        ).filter(
            models.Q(valid_until__isnull=True) |
            models.Q(valid_until__gt=now)
        )

        return [
            discount for discount in active_discounts
            if total_orders >= discount.min_orders
            and total_spent >= discount.min_total_spent
        ]

    @staticmethod
    def get_best_discount(order: Order) -> DiscountRule | None:
        """
        Находит лучшую доступную скидку для заказа
        """
        available_discounts = DiscountService.get_available_discounts(order.client)
        
        if not available_discounts:
            return None

        best_discount = None
        max_discount_amount = 0

        for discount in available_discounts:
            # Проверяем применимость скидки к типу работы
            if discount.work_types.exists() and order.work_type not in discount.work_types.all():
                continue

            # Рассчитываем сумму скидки
            if discount.discount_type == 'percentage':
                discount_amount = (order.budget * discount.value) / 100
            else:
                discount_amount = min(discount.value, order.budget)

            if discount_amount > max_discount_amount:
                max_discount_amount = discount_amount
                best_discount = discount

        return best_discount

    @staticmethod
    def apply_best_discount(order: Order) -> bool:
        """
        Применяет лучшую доступную скидку к заказу
        Возвращает True если скидка была применена
        """
        best_discount = DiscountService.get_best_discount(order)
        if best_discount:
            return order.apply_discount(best_discount)
        return False 
