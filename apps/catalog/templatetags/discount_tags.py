from django import template
from decimal import Decimal

register = template.Library()

@register.filter
def subtract(value, arg):
    """Вычитает arg из value"""
    try:
        return Decimal(str(value)) - Decimal(str(arg))
    except (ValueError, TypeError):
        return 0

@register.filter
def divide(value, arg):
    """Делит value на arg"""
    try:
        arg = Decimal(str(arg))
        if arg == 0:
            return 0
        return Decimal(str(value)) / arg
    except (ValueError, TypeError):
        return 0

@register.filter
def multiply(value, arg):
    """Умножает value на arg"""
    try:
        return Decimal(str(value)) * Decimal(str(arg))
    except (ValueError, TypeError):
        return 0

@register.filter
def percentage(value):
    """Форматирует число как процент"""
    try:
        return f"{float(value):.1f}%"
    except (ValueError, TypeError):
        return "0%"

@register.filter
def currency(value):
    """Форматирует число как денежную сумму"""
    try:
        return f"{float(value):,.2f} ₽".replace(",", " ")
    except (ValueError, TypeError):
        return "0.00 ₽" 