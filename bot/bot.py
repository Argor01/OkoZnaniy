import os
import django
import asyncio

from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command

# Настройка Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.users.models import User

BOT_TOKEN = os.getenv("BOT_TOKEN")
bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    user, created = User.objects.get_or_create(username=message.from_user.username,
                                               defaults={'telegram_id': message.from_user.id})
    if not created:
        user.telegram_id = message.from_user.id
        user.save()
    await message.answer("Привет! Твой Telegram ID сохранён. Добро пожаловать на биржу!")

async def main():
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
