"""Клиент публичного сервиса ФНС «Проверка статуса налогоплательщика НПД».

POST https://statusnpd.nalog.ru/api/v1/tracker/taxpayer_status
    {"inn": "525741209968", "requestDate": "2026-08-22"}
Ответ: {"status": true, "message": "... является плательщиком налога ..."}

Сервис публичный и бесплатный, авторизация не требуется.

Важно: статус самозанятого нужно проверять перед КАЖДОЙ выплатой —
физлицо может сняться с учёта в любой момент, и тогда платформа
становится налоговым агентом по НДФЛ. Поэтому результат кэшируется
на короткий срок и каждая проверка логируется (см. NpdStatusCheck).
"""
from __future__ import annotations

import json
import logging
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import date

from django.conf import settings

logger = logging.getLogger(__name__)

API_URL = getattr(
    settings, "FNS_NPD_API_URL",
    "https://statusnpd.nalog.ru/api/v1/tracker/taxpayer_status",
)
TIMEOUT = float(getattr(settings, "FNS_NPD_TIMEOUT", 8))


@dataclass(frozen=True)
class NpdResult:
    """Результат обращения к ФНС.

    is_self_employed:
        True  — на указанную дату плательщик НПД;
        False — не является плательщиком НПД;
        None  — выяснить не удалось (сеть, таймаут, ошибка сервиса).
    """
    is_self_employed: bool | None
    message: str
    raw: dict
    ok: bool

    @property
    def unknown(self) -> bool:
        return self.is_self_employed is None


def check_self_employed(inn: str, on_date: date | None = None) -> NpdResult:
    """Спрашивает у ФНС, является ли ИНН плательщиком НПД на дату.

    Никогда не бросает исключений: недоступность ФНС не должна ронять
    выплату — вызывающий код сам решает, как поступить с unknown.
    """
    request_date = (on_date or date.today()).isoformat()
    payload = json.dumps({"inn": str(inn), "requestDate": request_date}).encode("utf-8")
    req = urllib.request.Request(
        API_URL,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            body = json.loads(resp.read().decode("utf-8") or "{}")
    except urllib.error.HTTPError as e:
        # 422 — бизнес-ошибка: некорректный ИНН или сервис не смог обработать.
        try:
            body = json.loads(e.read().decode("utf-8") or "{}")
        except Exception:  # noqa: BLE001
            body = {}
        message = body.get("message") or f"ФНС вернула HTTP {e.code}"
        logger.warning("ФНС НПД: HTTP %s для ИНН %s — %s", e.code, inn, message)
        return NpdResult(is_self_employed=None, message=message, raw=body, ok=False)
    except Exception as e:  # noqa: BLE001
        logger.warning("ФНС НПД недоступна для ИНН %s: %s", inn, e)
        return NpdResult(
            is_self_employed=None,
            message="Сервис ФНС временно недоступен",
            raw={},
            ok=False,
        )

    status = body.get("status")
    if not isinstance(status, bool):
        return NpdResult(
            is_self_employed=None,
            message=body.get("message") or "Неожиданный ответ ФНС",
            raw=body,
            ok=False,
        )

    default_msg = (
        f"{inn} является плательщиком налога на профессиональный доход"
        if status else
        f"{inn} не является плательщиком налога на профессиональный доход"
    )
    return NpdResult(
        is_self_employed=status,
        message=body.get("message") or default_msg,
        raw=body,
        ok=True,
    )
