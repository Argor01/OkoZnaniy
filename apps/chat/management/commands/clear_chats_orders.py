from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.chat.models import Chat, SupportChat
from apps.orders.models import Order


class Command(BaseCommand):
    help = "Быстрая очистка чатов и заказов из БД"

    def add_arguments(self, parser):
        parser.add_argument(
            "--yes",
            action="store_true",
            help="Подтвердить удаление без интерактивного запроса",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Только показать, что будет удалено, без фактического удаления",
        )
        parser.add_argument(
            "--no-support",
            action="store_true",
            help="Не удалять чаты поддержки",
        )

    def handle(self, *args, **options):
        dry_run = bool(options.get("dry_run"))
        confirmed = bool(options.get("yes"))
        no_support = bool(options.get("no_support"))

        order_count = Order.objects.count()
        chat_count = Chat.objects.count()
        support_chat_count = SupportChat.objects.count()

        self.stdout.write("Текущее состояние:")
        self.stdout.write(f"- Заказы: {order_count}")
        self.stdout.write(f"- Обычные чаты: {chat_count}")
        self.stdout.write(f"- Чаты поддержки: {support_chat_count}")

        if dry_run:
            self.stdout.write(self.style.WARNING("Dry-run: удаление не выполнялось"))
            return

        if not confirmed:
            raise CommandError("Для удаления передайте флаг --yes")

        with transaction.atomic():
            deleted_chat_result = Chat.objects.all().delete()
            deleted_order_result = Order.objects.all().delete()
            deleted_support_result = (0, {})
            if not no_support:
                deleted_support_result = SupportChat.objects.all().delete()

        self.stdout.write(self.style.SUCCESS("Очистка завершена"))
        self.stdout.write(f"- Удаление обычных чатов: {deleted_chat_result}")
        self.stdout.write(f"- Удаление заказов: {deleted_order_result}")
        if no_support:
            self.stdout.write("- Чаты поддержки не удалялись (--no-support)")
        else:
            self.stdout.write(f"- Удаление чатов поддержки: {deleted_support_result}")

        self.stdout.write("Состояние после очистки:")
        self.stdout.write(f"- Заказы: {Order.objects.count()}")
        self.stdout.write(f"- Обычные чаты: {Chat.objects.count()}")
        self.stdout.write(f"- Чаты поддержки: {SupportChat.objects.count()}")
