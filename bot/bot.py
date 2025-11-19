import os
import django
import asyncio
import logging

from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from asgiref.sync import sync_to_async

# Настройка Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.users.models import User
from django.conf import settings
from django.core.cache import cache
from rest_framework_simplejwt.tokens import RefreshToken

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BOT_TOKEN = os.getenv("BOT_TOKEN") or os.getenv("TELEGRAM_BOT_TOKEN")
if not BOT_TOKEN:
    raise ValueError("BOT_TOKEN или TELEGRAM_BOT_TOKEN не установлен!")

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

# URL вашего сайта (для продакшена замените на реальный)
WEBSITE_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

@sync_to_async
def get_or_create_user(telegram_id, username, first_name, last_name):
    """Получить или создать пользователя (синхронная функция)"""
    try:
        user = User.objects.get(telegram_id=telegram_id)
        created = False
        # Обновляем данные
        user.first_name = first_name
        user.last_name = last_name
        if username and not username.startswith('user_'):
            user.username = username
        user.save()
        logger.info(f"Пользователь обновлен: {user.username} (telegram_id: {telegram_id})")
    except User.DoesNotExist:
        # Создаем нового пользователя
        user = User.objects.create(
            username=username,
            telegram_id=telegram_id,
            first_name=first_name,
            last_name=last_name,
            role='client'
        )
        created = True
        logger.info(f"Новый пользователь создан: {user.username} (telegram_id: {telegram_id})")
    return user, created

@sync_to_async
def save_auth_data(auth_id, user):
    """Сохранить данные авторизации в кеш"""
    # Генерируем токены
    refresh = RefreshToken.for_user(user)
    access_token = str(refresh.access_token)
    refresh_token = str(refresh)
    
    # Сохраняем данные авторизации в кеш на 5 минут
    auth_data = {
        'authenticated': True,
        'access': access_token,
        'refresh': refresh_token,
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'role': user.role,
            'first_name': user.first_name,
            'last_name': user.last_name,
        }
    }
    cache.set(f'telegram_auth_{auth_id}', auth_data, 300)  # 5 минут
    logger.info(f"Авторизация сохранена для auth_id: {auth_id}")
    return user.get_role_display()

@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    """Команда /start - приветствие и регистрация"""
    telegram_id = message.from_user.id
    username = message.from_user.username or f"user_{telegram_id}"
    first_name = message.from_user.first_name or ""
    last_name = message.from_user.last_name or ""
    
    # Проверяем, есть ли параметр авторизации
    command_args = message.text.split()
    auth_id = None
    if len(command_args) > 1 and command_args[1].startswith('auth_'):
        auth_id = command_args[1].replace('auth_', '')
        logger.info(f"Получен запрос на авторизацию с ID: {auth_id}")
    
    # Получаем или создаем пользователя
    user, created = await get_or_create_user(telegram_id, username, first_name, last_name)
    
    # Если это запрос на авторизацию
    if auth_id:
        role_display = await save_auth_data(auth_id, user)
        
        await message.answer(
            f"✅ Авторизация успешна!\n\n"
            f"Вы вошли как: {first_name} {last_name}\n"
            f"Роль: {role_display}\n\n"
            f"Вернитесь на сайт - вы будете автоматически авторизованы!"
        )
        return
    
    # Обычное приветствие
    if created:
        welcome_text = (
            f"👋 Привет, {first_name}!\n\n"
            f"Добро пожаловать на платформу OkoZnaniy!\n\n"
            f"🎓 Здесь вы можете:\n"
            f"• Заказать выполнение учебных работ\n"
            f"• Стать экспертом и зарабатывать\n"
            f"• Участвовать в партнерской программе\n\n"
            f"Ваш Telegram ID сохранен. Теперь вы можете войти на сайт через Telegram!\n\n"
            f"Используйте команды:\n"
            f"/help - Помощь\n"
            f"/profile - Ваш профиль\n"
            f"/balance - Баланс"
        )
    else:
        welcome_text = (
            f"👋 С возвращением, {first_name}!\n\n"
            f"Ваши данные обновлены.\n\n"
            f"Используйте команды:\n"
            f"/help - Помощь\n"
            f"/profile - Ваш профиль\n"
            f"/balance - Баланс"
        )
    
    # Кнопка для перехода на сайт
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🌐 Открыть сайт", url=WEBSITE_URL)]
    ])
    
    await message.answer(welcome_text, reply_markup=keyboard)

@dp.message(Command("help"))
async def cmd_help(message: types.Message):
    """Команда /help - справка"""
    help_text = (
        "📚 Доступные команды:\n\n"
        "/start - Начать работу с ботом\n"
        "/help - Показать эту справку\n"
        "/profile - Посмотреть свой профиль\n"
        "/balance - Проверить баланс\n"
        "/link - Получить ссылку для входа\n\n"
        "💡 Вы можете войти на сайт через Telegram, используя кнопку 'Login with Telegram' на странице входа."
    )
    
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🌐 Открыть сайт", url=WEBSITE_URL)]
    ])
    
    await message.answer(help_text, reply_markup=keyboard)

@sync_to_async
def get_user_profile(telegram_id):
    """Получить профиль пользователя"""
    try:
        user = User.objects.get(telegram_id=telegram_id)
        return {
            'found': True,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'username': user.username,
            'role': user.get_role_display(),
            'email': user.email or 'Не указан',
            'phone': user.phone or 'Не указан',
            'date_joined': user.date_joined.strftime('%d.%m.%Y')
        }
    except User.DoesNotExist:
        return {'found': False}

@dp.message(Command("profile"))
async def cmd_profile(message: types.Message):
    """Команда /profile - информация о профиле"""
    telegram_id = message.from_user.id
    
    profile = await get_user_profile(telegram_id)
    
    if profile['found']:
        profile_text = (
            f"👤 Ваш профиль:\n\n"
            f"Имя: {profile['first_name']} {profile['last_name']}\n"
            f"Username: @{profile['username']}\n"
            f"Роль: {profile['role']}\n"
            f"Email: {profile['email']}\n"
            f"Телефон: {profile['phone']}\n"
            f"Дата регистрации: {profile['date_joined']}\n"
        )
        
        keyboard = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="✏️ Редактировать профиль", url=f"{WEBSITE_URL}/profile")]
        ])
        
        await message.answer(profile_text, reply_markup=keyboard)
    else:
        await message.answer(
            "❌ Пользователь не найден. Используйте /start для регистрации."
        )

@sync_to_async
def get_user_balance(telegram_id):
    """Получить баланс пользователя"""
    try:
        user = User.objects.get(telegram_id=telegram_id)
        return {
            'found': True,
            'balance': user.balance,
            'frozen_balance': user.frozen_balance,
            'role': user.role,
            'total_earnings': user.total_earnings if user.role == 'partner' else 0
        }
    except User.DoesNotExist:
        return {'found': False}

@dp.message(Command("balance"))
async def cmd_balance(message: types.Message):
    """Команда /balance - проверка баланса"""
    telegram_id = message.from_user.id
    
    balance_data = await get_user_balance(telegram_id)
    
    if balance_data['found']:
        balance_text = (
            f"💰 Ваш баланс:\n\n"
            f"Доступно: {balance_data['balance']} ₽\n"
            f"Заморожено: {balance_data['frozen_balance']} ₽\n"
            f"Всего: {balance_data['balance'] + balance_data['frozen_balance']} ₽\n"
        )
        
        if balance_data['role'] == 'partner':
            balance_text += f"\n💼 Партнерский доход: {balance_data['total_earnings']} ₽"
        
        keyboard = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="💳 Пополнить баланс", url=f"{WEBSITE_URL}/balance")]
        ])
        
        await message.answer(balance_text, reply_markup=keyboard)
    else:
        await message.answer(
            "❌ Пользователь не найден. Используйте /start для регистрации."
        )

@dp.message(Command("link"))
async def cmd_link(message: types.Message):
    """Команда /link - получить ссылку для входа"""
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🔐 Войти через Telegram", url=f"{WEBSITE_URL}/login")]
    ])
    
    await message.answer(
        "🔗 Нажмите кнопку ниже, чтобы войти на сайт через Telegram:",
        reply_markup=keyboard
    )

async def main():
    """Запуск бота"""
    logger.info("Запуск Telegram бота...")
    logger.info(f"Bot token: {BOT_TOKEN[:20]}...")
    logger.info(f"Website URL: {WEBSITE_URL}")
    
    try:
        # Удаляем вебхук если был установлен
        await bot.delete_webhook(drop_pending_updates=True)
        logger.info("Вебхук удален")
        
        # Запускаем polling
        logger.info("Начинаем polling...")
        await dp.start_polling(bot)
    except Exception as e:
        logger.error(f"Ошибка при запуске бота: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(main())
