import os
from vk_api.keyboard import VkKeyboard, VkKeyboardColor

WEBSITE_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")


def get_main_keyboard():
    keyboard = VkKeyboard(one_time=False)
    keyboard.add_button('Профиль', color=VkKeyboardColor.PRIMARY)
    keyboard.add_button('Баланс', color=VkKeyboardColor.PRIMARY)
    keyboard.add_line()
    keyboard.add_button('Мои заказы', color=VkKeyboardColor.SECONDARY)
    keyboard.add_button('Уведомления', color=VkKeyboardColor.SECONDARY)
    keyboard.add_line()
    keyboard.add_button('Помощь', color=VkKeyboardColor.SECONDARY)
    keyboard.add_line()
    keyboard.add_openlink_button('Открыть сайт', WEBSITE_URL)
    return keyboard.get_keyboard()


def get_notifications_keyboard(enabled: bool):
    keyboard = VkKeyboard(one_time=False)
    if enabled:
        keyboard.add_button('Выключить уведомления', color=VkKeyboardColor.NEGATIVE)
    else:
        keyboard.add_button('Включить уведомления', color=VkKeyboardColor.POSITIVE)
    keyboard.add_line()
    keyboard.add_button('Назад', color=VkKeyboardColor.SECONDARY)
    return keyboard.get_keyboard()


def get_auth_success_keyboard():
    keyboard = VkKeyboard(one_time=True)
    keyboard.add_openlink_button('Открыть сайт', WEBSITE_URL)
    keyboard.add_line()
    keyboard.add_button('Профиль', color=VkKeyboardColor.PRIMARY)
    return keyboard.get_keyboard()
