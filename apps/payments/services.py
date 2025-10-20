from typing import Dict, Any
from decimal import Decimal
from django.conf import settings
from django.utils import timezone
from .models import Payment, PaymentMethod, PaymentStatus
from .providers.alfabank import AlfaBankClient
from .providers.sbp import SBPClient


class PaymentService:
    @staticmethod
    def create_payment(order, payment_method: str) -> Payment:
        """
        Создает новый платеж для заказа
        """
        payment = Payment.objects.create(
            order=order,
            amount=order.final_price or order.budget,
            payment_method=payment_method,
            status=PaymentStatus.PENDING,
            payment_id=f"tmp-{order.id}-{timezone.now().timestamp()}"
        )
        return payment

    @staticmethod
    def get_payment_link(payment: Payment) -> str:
        """
        Генерирует ссылку для оплаты в зависимости от метода
        """
        if payment.payment_method == PaymentMethod.CARD:
            return PaymentService._get_alfabank_payment_link(payment)
        elif payment.payment_method == PaymentMethod.SBP:
            return PaymentService._get_sbp_link(payment)
        raise ValueError(f"Неподдерживаемый метод оплаты: {payment.payment_method}")

    @staticmethod
    def process_payment_callback(payment_id: str, data: Dict[str, Any]) -> bool:
        """
        Обрабатывает callback от платежной системы
        """
        try:
            payment = Payment.objects.get(payment_id=payment_id)
            
            # Определяем провайдера платежа
            if payment.payment_method == PaymentMethod.CARD:
                result = AlfaBankClient().process_callback(data)
            elif payment.payment_method == PaymentMethod.SBP:
                result = SBPClient().process_callback(data)
            else:
                result = None

            if result:
                # Обновляем статус заказа
                order = payment.order
                order.status = 'in_progress'
                order.save()
                return True
                
            return False
        except Payment.DoesNotExist:
            return False

    @staticmethod
    def _get_alfabank_payment_link(payment: Payment) -> str:
        """
        Получает ссылку для оплаты через Альфа-Банк
        """
        client = AlfaBankClient()
        response = client.register_payment(payment)
        return response['formUrl']

    @staticmethod
    def _get_sbp_link(payment: Payment) -> str:
        """
        Получает ссылку для оплаты через СБП
        """
        client = SBPClient()
        response = client.register_payment(payment)
        # Возвращаем URL для оплаты через СБП
        return response['qrUrl'] 