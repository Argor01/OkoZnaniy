from typing import Dict, Any
from decimal import Decimal
from django.conf import settings
from django.db.models import Sum
from django.utils import timezone
from .models import Payment, PaymentMethod, PaymentStatus
from .providers.alfabank import AlfaBankClient
from .providers.sbp import SBPClient
from .providers.tbank import TBankClient
from .providers.rbs import SberbankRBSClient, UralsibRBSClient
from .providers.yookassa import YooKassaClient
from apps.wallet.policy import order_quote, money


class PaymentService:
    @staticmethod
    def create_payment(order, payment_method: str) -> Payment:
        """
        Создает новый платеж для заказа
        """
        if not order.expert_id:
            raise ValueError('Сначала выберите исполнителя: средства должны блокироваться у автора.')
        quote = order_quote(order.final_price or order.budget, client=order.client)
        payment = Payment.objects.create(
            order=order,
            user=order.client,
            amount=quote['total'],
            payment_method=payment_method,
            status=PaymentStatus.PENDING,
            payment_id=f"tmp-{order.id}-{timezone.now().timestamp()}",
            metadata={k: str(v) for k, v in quote.items()},
        )
        return payment

    # Map user-facing method aliases to the underlying acquiring rail.
    _NORMALIZE_METHOD = {
        'card': 'card', 'sberbank': 'card',
        'sbp': 'sbp', 'sberpay_qr': 'sbp', 'tbank': 'tbank',
        'yookassa': 'yookassa',
    }

    @staticmethod
    def get_payment_link(payment: Payment) -> str:
        """Generate a payment link/QR for the chosen method.
        Works for both order payments and wallet top-ups (order may be None).
        """
        rail = PaymentService._NORMALIZE_METHOD.get(payment.payment_method)
        if rail is None:
            raise ValueError(f'Неподдерживаемый метод оплаты: {payment.payment_method}')
        from .config import ALFABANK_SETTINGS, SBP_SETTINGS, TBANK_SETTINGS
        if rail == 'yookassa':
            client = YooKassaClient()
            if not client.configured:
                raise ValueError('Оплата через ЮKassa временно недоступна: магазин не настроен')
            PaymentService._ensure_test_shop_payer(payment, client)
            return client.register_payment(payment)['formUrl']
        if rail == 'tbank':
            if not TBANK_SETTINGS.get('TERMINAL_KEY'):
                raise ValueError('Т-Банк временно недоступен: эквайринг не настроен')
            return PaymentService._get_tbank_payment_link(payment)
        if rail == 'card':
            return PaymentService._get_card_payment_link(payment)
        if not SBP_SETTINGS.get('MERCHANT_ID'):
            raise ValueError('Оплата через СБП временно недоступна: мерчант не настроен')
        return PaymentService._get_sbp_link(payment)

    @staticmethod
    def available_methods() -> list:
        """Способы оплаты, которые действительно можно провести.

        Неподключённый эквайер не должен светиться в интерфейсе: клиент
        выбирал способ, жал «Оплатить» и упирался в «временно
        недоступно» — ошибка всплывала уже после решения заплатить.
        Как только эквайер настроен, он появляется в списке сам.
        """
        from .config import SBP_SETTINGS, TBANK_SETTINGS

        methods = []
        if YooKassaClient().configured:
            methods.append({
                'value': 'yookassa',
                'label': 'ЮKassa',
                'hint': 'Карта, СБП или ЮMoney',
            })
        if TBANK_SETTINGS.get('TERMINAL_KEY'):
            methods.append({
                'value': 'tbank',
                'label': 'Т-Банк',
                'hint': 'Оплата картой через Т-Банк',
            })
        if SBP_SETTINGS.get('MERCHANT_ID'):
            methods.append({
                'value': 'sberpay_qr',
                'label': 'СберPay QR',
                'hint': 'Сканируй QR в Сбер Онлайн',
            })

        # Отдельная кнопка «картой» нужна, только если карту обслуживает
        # не ЮKassa: иначе это второй вход в тот же платёжный шлюз.
        entry = PaymentService._CARD_ACQUIRERS.get(PaymentService._card_acquirer())
        if entry is not None:
            card_client = entry[0]()
            if card_client.configured and not isinstance(card_client, YooKassaClient):
                methods.append({
                    'value': 'card',
                    'label': 'Банковская карта',
                    'hint': 'Оплата картой через %s' % entry[1],
                })
        return methods

    @staticmethod
    def process_payment_callback(payment_id: str, data: Dict[str, Any]) -> bool:
        """
        Обрабатывает callback от платежной системы
        """
        try:
            payment = Payment.objects.get(payment_id=payment_id)
            
            # Определяем провайдера платежа
            rail = PaymentService._NORMALIZE_METHOD.get(payment.payment_method)
            if rail == 'yookassa':
                result = YooKassaClient().process_callback(data)
            elif rail == 'tbank':
                result = TBankClient().process_callback(data)
            elif rail == PaymentMethod.CARD:
                card_client = PaymentService._card_client()
                if card_client is not None:
                    result = card_client.process_callback(data)
                else:
                    result = AlfaBankClient().process_callback(data)
            elif rail == PaymentMethod.SBP:
                result = SBPClient().process_callback(data)
            else:
                result = None

            if result:
                if payment.status != PaymentStatus.COMPLETED:
                    payment.status = PaymentStatus.COMPLETED
                    payment.paid_at = timezone.now()
                    payment.save(update_fields=['status', 'paid_at', 'updated_at'])
                if payment.order_id:
                    PaymentService._reserve_order_payment(payment)
                    order = payment.order
                    order.status = 'in_progress'
                    order.save(update_fields=['status'])
                return True
                
            return False
        except Payment.DoesNotExist:
            return False

    @staticmethod
    def _reserve_order_payment(payment: Payment) -> None:
        """Reflect a successful external order payment in the wallet ledger."""
        if not payment.order_id:
            return

        from apps.orders.models import Transaction, TransactionType
        from apps.wallet.services import WalletService

        order = payment.order
        client = order.client
        base_amount = money(payment.metadata.get('base_amount') or order.final_price or order.budget)
        service_fee = money(
            payment.metadata.get('service_fee')
            or order_quote(base_amount, client=client)['service_fee']
        )
        escrow_amount = money(base_amount + service_fee)

        if not Transaction.objects.filter(
            user=client,
            payment=payment,
            type=TransactionType.TOPUP,
        ).exists():
            WalletService.topup(
                client,
                escrow_amount,
                payment=payment,
                order=order,
                description=f'Оплата заказа #{order.id}',
            )

        aggregate = Transaction.objects.filter(user=client, order=order).values('type').annotate(
            total=Sum('amount')
        )
        totals = {row['type']: row['total'] for row in aggregate}
        active_hold = (
            (totals.get(TransactionType.HOLD) or Decimal('0.00'))
            - (totals.get(TransactionType.RELEASE) or Decimal('0.00'))
            - (totals.get(TransactionType.REFUND) or Decimal('0.00'))
        )
        if active_hold < escrow_amount:
            if not order.expert_id:
                raise ValueError('У заказа не выбран исполнитель для распределённого escrow')
            WalletService.fund_distributed_escrow(
                client=client, expert=order.expert,
                base_amount=base_amount, service_fee=service_fee,
                fund_amount=escrow_amount - active_hold,
                order=order, description=f'Резерв по заказу #{order.id}',
            )

    @staticmethod
    def _get_tbank_payment_link(payment: Payment) -> str:
        return TBankClient().register_payment(payment)['formUrl']

    # Банки на шлюзе RBS: протокол один, различаются адрес и учётные данные.
    _RBS_ACQUIRERS = {
        'uralsib': (UralsibRBSClient, 'Уралсиб'),
        'sberbank': (SberbankRBSClient, 'Сбербанк'),
    }

    # Все эквайреры карточной рельсы: банки на RBS и агрегатор ЮKassa.
    # Клиенты отвечают на один и тот же набор методов, поэтому сервисному
    # слою не нужно знать, кто именно обслуживает платёж.
    _CARD_ACQUIRERS = {
        **_RBS_ACQUIRERS,
        'yookassa': (YooKassaClient, 'ЮKassa'),
    }

    @staticmethod
    def _card_rbs_client():
        """Клиент RBS для текущего эквайрера или None, если банк не на RBS."""
        entry = PaymentService._RBS_ACQUIRERS.get(PaymentService._card_acquirer())
        return entry[0]() if entry else None

    @staticmethod
    def _card_client():
        """Клиент текущего карточного эквайрера или None, если это Альфа-Банк."""
        entry = PaymentService._CARD_ACQUIRERS.get(PaymentService._card_acquirer())
        return entry[0]() if entry else None

    # Кому открыт тестовый магазин, пока не подключён боевой ключ.
    TEST_SHOP_ROLES = frozenset({'director', 'admin'})

    @staticmethod
    def _payer(payment: Payment):
        """Кто платит: владелец платежа, а для оплаты заказа — его заказчик."""
        if getattr(payment, 'user_id', None):
            return payment.user
        if getattr(payment, 'order_id', None):
            return payment.order.client
        return None

    @staticmethod
    def _ensure_test_shop_payer(payment: Payment, client) -> None:
        """Не пускает реальных клиентов в тестовый магазин.

        Ключ вида test_* создаёт платежи, которые ничего не списывают, но
        возвращаются к нам успешными и зачисляются на кошелёк. Пока
        подключён тестовый магазин, платить через него могут только
        сотрудники и учётки @okoznaniy.test — иначе любой желающий
        пополнит баланс несуществующими деньгами.

        Проверка привязана к префиксу ключа, а не к отдельной настройке:
        забыть переключить флаг легко, а подменить ключ незаметно — нет.
        """
        if not client.test_mode:
            return
        payer = PaymentService._payer(payment)
        if payer is not None:
            # Права на площадке размечены полем role: is_staff здесь не
            # проставлен никому, поэтому одной проверки на него мало —
            # она отсекала бы и директора с администратором.
            if getattr(payer, 'is_staff', False):
                return
            if getattr(payer, 'role', '') in PaymentService.TEST_SHOP_ROLES:
                return
            # Аккаунт, которому явно разрешили тестовую оплату: так можно
            # пройти весь сценарий обычным пользователем, не открывая
            # тестовый магазин всей площадке.
            if getattr(payer, 'test_payments_allowed', False):
                return
            email = (getattr(payer, 'email', '') or '').lower()
            if email.endswith('@okoznaniy.test'):
                return
        raise ValueError(
            'Оплата через ЮKassa временно недоступна: подключён тестовый магазин'
        )

    @staticmethod
    def _card_acquirer() -> str:
        """Какой банк обслуживает оплату картой. Переключается CARD_ACQUIRER."""
        return (getattr(settings, 'CARD_ACQUIRER', 'uralsib') or 'uralsib').lower()

    @staticmethod
    def _get_card_payment_link(payment: Payment) -> str:
        """Ссылка на платёжную форму выбранного карточного эквайера."""
        from .config import ALFABANK_SETTINGS, URALSIB_SETTINGS
        acquirer = PaymentService._card_acquirer()
        entry = PaymentService._CARD_ACQUIRERS.get(acquirer)
        if entry is not None:
            client_cls, bank_label = entry
            client = client_cls()
            if not client.configured:
                raise ValueError(
                    f'Оплата картой временно недоступна: эквайринг {bank_label} не настроен'
                )
            if isinstance(client, YooKassaClient):
                PaymentService._ensure_test_shop_payer(payment, client)
            return client.register_payment(payment)['formUrl']
        if not ALFABANK_SETTINGS.get('USERNAME'):
            raise ValueError('Оплата картой временно недоступна: эквайринг не настроен')
        return PaymentService._get_alfabank_payment_link(payment)

    @staticmethod
    def refund_payment(payment: Payment, amount=None):
        """Возврат средств плательщику через эквайера, проводившего платёж.

        Возврат возможен только по оплаченному платежу и только тем
        каналом, которым он был проведён — этого требуют правила
        платёжных систем.
        """
        if payment.status != PaymentStatus.COMPLETED:
            raise ValueError('Возврат возможен только по оплаченному платежу')
        rail = PaymentService._NORMALIZE_METHOD.get(payment.payment_method)
        if rail == 'yookassa':
            acquirer_client = YooKassaClient()
        else:
            acquirer_client = PaymentService._card_client() if rail == 'card' else None
        if acquirer_client is not None:
            result = acquirer_client.refund(payment, amount)
        else:
            raise ValueError(
                f'Автоматический возврат для метода «{payment.payment_method}» не реализован'
            )
        payment.status = PaymentStatus.REFUNDED
        payment.metadata = {**(payment.metadata or {}), 'refund': result}
        payment.save(update_fields=['status', 'metadata', 'updated_at'])
        return payment

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
