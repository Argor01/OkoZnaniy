"""Проверка ИНН по контрольной сумме.

Алгоритм — приказ ФНС России от 29.06.2012 № ММВ-7-6/435@.
Проверяем только математическую корректность номера: это отсекает
опечатки и выдуманные номера до обращения к внешним сервисам.
Существование налогоплательщика подтверждается отдельно (см. fns.py).
"""

_WEIGHTS_10 = (2, 4, 10, 3, 5, 9, 4, 6, 8)
_WEIGHTS_11 = (7, 2, 4, 10, 3, 5, 9, 4, 6, 8)
_WEIGHTS_12 = (3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8)


class InvalidINN(ValueError):
    """ИНН не прошёл проверку контрольной суммы."""


def _checksum(digits, weights) -> int:
    return sum(d * w for d, w in zip(digits, weights)) % 11 % 10


def normalize_inn(value) -> str:
    """Убирает пробелы и дефисы, оставляя только цифры."""
    return "".join(ch for ch in str(value or "") if ch.isdigit())


def is_valid_inn(value) -> bool:
    """True, если ИНН состоит из 10 или 12 цифр и сходится контрольная сумма."""
    digits_str = normalize_inn(value)
    if len(digits_str) not in (10, 12):
        return False
    digits = [int(ch) for ch in digits_str]

    if len(digits) == 10:
        # ИНН юридического лица: одна контрольная цифра — последняя.
        return _checksum(digits[:9], _WEIGHTS_10) == digits[9]

    # ИНН физического лица или ИП: две контрольные цифры.
    return (
        _checksum(digits[:10], _WEIGHTS_11) == digits[10]
        and _checksum(digits[:11], _WEIGHTS_12) == digits[11]
    )


def validate_inn(value) -> str:
    """Возвращает нормализованный ИНН либо бросает InvalidINN."""
    digits = normalize_inn(value)
    if not digits:
        raise InvalidINN("ИНН не указан")
    if len(digits) not in (10, 12):
        raise InvalidINN("ИНН должен содержать 10 или 12 цифр")
    if not is_valid_inn(digits):
        raise InvalidINN("ИНН некорректен: не сходится контрольная сумма")
    return digits


def is_personal_inn(value) -> bool:
    """12 цифр — ИНН физлица или ИП, 10 — юрлица."""
    return len(normalize_inn(value)) == 12
