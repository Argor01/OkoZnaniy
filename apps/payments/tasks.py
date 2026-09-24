"""Сверка платежей со шлюзом.

Уведомление от эквайера — не гарантия. Оно теряется, если наш бэкенд в
этот момент перезапускался, если адрес уведомлений в кабинете указан
неверно или если у шлюза сбой. Платёж при этом проходит: деньги у
человека списаны, а на площадке он так и висит «в ожидании».

Так и случилось на боевом запуске: оплата прошла, уведомление не пришло
ни разу, баланс остался нулевым. Поэтому уведомление — только повод
свериться раньше, а источник правды — регулярный опрос шлюза.

Два прохода навстречу друг другу:

* от наших записей — находит платежи, по которым не пришло уведомление;
* от списка оплат у эквайера — находит платежи, ссылку на которые наша
  запись потеряла (процесс упал между вызовом шлюза и сохранением) и по
  своим полям их уже не найти.

Проводим тем же кодом, что и уведомление: он перепроверяет состояние
запросом к API, а зачисление идемпотентно — повторный вызов по уже
проведённому платежу денег не добавит.
"""
import logging
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger("oko.payments")

# Способы оплаты, которые обслуживает ЮKassa.
YOOKASSA_METHODS = ("yookassa", "yookassa_sbp", "yookassa_card", "yookassa_yoomoney")


def _settle(payment_id: str, remote_id: str) -> bool:
    """Проводит платёж так же, как это делает уведомление от шлюза."""
    from .services import PaymentService

    data = {"event": "payment.succeeded", "object": {"id": remote_id}}
    return bool(PaymentService.process_payment_callback(payment_id, data))


@shared_task(name="apps.payments.tasks.reconcile_pending_payments")
def reconcile_pending_payments(max_age_hours: int = 72, min_age_seconds: int = 120) -> dict:
    """Спрашивает шлюз о судьбе платежей, оставшихся в ожидании.

    min_age_seconds — не трогаем совсем свежие: человек ещё стоит на
    платёжной форме, и уведомление придёт своим чередом.
    max_age_hours — дальше смысла нет: ЮKassa отменяет неоплаченный
    платёж сама, а повторять запросы по мёртвым записям незачем.
    """
    from .models import Payment, PaymentStatus
    from .providers.yookassa import YooKassaClient

    if not YooKassaClient().configured:
        logger.warning("Сверка платежей пропущена: ЮKassa не настроена")
        return {"checked": 0, "settled": 0, "errors": 0, "skipped": "not_configured"}

    now = timezone.now()
    pending = (
        Payment.objects.filter(
            status=PaymentStatus.PENDING,
            payment_method__in=YOOKASSA_METHODS,
            created_at__lte=now - timedelta(seconds=min_age_seconds),
            created_at__gte=now - timedelta(hours=max_age_hours),
        )
        .order_by("created_at")
    )

    checked = settled = errors = 0
    for payment in pending.iterator():
        remote_id = (payment.metadata or {}).get("yookassa_payment_id")
        if not remote_id:
            # Ссылка на платёж не сохранилась — такой случай ловит
            # встречный проход reconcile_gateway_payments.
            continue
        checked += 1
        try:
            if _settle(payment.payment_id, remote_id):
                settled += 1
                logger.warning(
                    "Сверка: платёж %s проведён, уведомление от шлюза не дошло",
                    payment.payment_id,
                )
        except Exception:  # noqa: BLE001
            # Один битый платёж не должен останавливать сверку остальных.
            errors += 1
            logger.exception("Сверка: не удалось обработать платёж %s", payment.payment_id)

    if settled or errors:
        logger.warning(
            "Сверка платежей: проверено %s, проведено %s, ошибок %s",
            checked, settled, errors,
        )
    return {"checked": checked, "settled": settled, "errors": errors}


@shared_task(name="apps.payments.tasks.reconcile_gateway_payments")
def reconcile_gateway_payments(max_age_hours: int = 72, limit: int = 100) -> dict:
    """Сверка с другой стороны: что шлюз считает оплаченным.

    Нашу запись ищем по payment_id, который ЮKassa хранит в метаданных
    платежа. Если записи нет вовсе — деньги приняты, а зачислить их не на
    что: пишем в лог как ошибку, тут нужен человек.
    """
    from .models import Payment, PaymentStatus
    from .providers.yookassa import YooKassaClient

    client = YooKassaClient()
    if not client.configured:
        return {"checked": 0, "settled": 0, "orphans": 0, "skipped": "not_configured"}

    since = (timezone.now() - timedelta(hours=max_age_hours)).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    try:
        body = client.list_payments(
            status="succeeded", limit=limit, **{"created_at.gte": since},
        )
    except Exception:  # noqa: BLE001
        logger.exception("Сверка со шлюзом: не удалось получить список платежей")
        return {"checked": 0, "settled": 0, "orphans": 0, "errors": 1}

    checked = settled = orphans = errors = 0
    for obj in body.get("items", []):
        if not obj.get("paid"):
            continue
        checked += 1
        our_id = (obj.get("metadata") or {}).get("payment_id")
        if not our_id:
            continue
        payment = Payment.objects.filter(payment_id=our_id).first()
        if payment is None:
            orphans += 1
            logger.error(
                "Сверка со шлюзом: оплата %s на %s принята, но записи %s в базе нет",
                obj.get("id"), (obj.get("amount") or {}).get("value"), our_id,
            )
            continue
        if payment.status == PaymentStatus.COMPLETED:
            continue
        remote_id = obj.get("id")
        if (payment.metadata or {}).get("yookassa_payment_id") != remote_id:
            # Восстанавливаем потерянную связь: без неё платёж не найти
            # ни этой сверкой, ни уведомлением, если оно всё же придёт.
            payment.metadata = {
                **(payment.metadata or {}), "yookassa_payment_id": remote_id,
            }
            payment.save(update_fields=["metadata", "updated_at"])
        try:
            if _settle(payment.payment_id, remote_id):
                settled += 1
                logger.warning(
                    "Сверка со шлюзом: платёж %s проведён, уведомление не дошло",
                    payment.payment_id,
                )
        except Exception:  # noqa: BLE001
            errors += 1
            logger.exception("Сверка со шлюзом: не удалось провести %s", payment.payment_id)

    if settled or orphans or errors:
        logger.warning(
            "Сверка со шлюзом: оплат %s, проведено %s, без записи %s, ошибок %s",
            checked, settled, orphans, errors,
        )
    return {"checked": checked, "settled": settled, "orphans": orphans, "errors": errors}
