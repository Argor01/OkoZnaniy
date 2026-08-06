from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.chat.models import Chat, SupportChat
from apps.orders.models import Order
from apps.arbitration.models import ArbitrationCase, ArbitrationMessage, ArbitrationActivity, Complaint
from apps.admin_panel.models import Claim, ClaimMessage


class Command(BaseCommand):
    help = "Быстрая очистка чатов, заказов, арбитража и претензий из БД"

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
        arb_case_count = ArbitrationCase.objects.count()
        arb_msg_count = ArbitrationMessage.objects.count()
        arb_act_count = ArbitrationActivity.objects.count()
        complaint_count = Complaint.objects.count()
        claim_count = Claim.objects.count()
        claim_msg_count = ClaimMessage.objects.count()

        self.stdout.write("Текущее состояние:")
        self.stdout.write(f"- Заказы: {order_count}")
        self.stdout.write(f"- Обычные чаты: {chat_count}")
        self.stdout.write(f"- Чаты поддержки: {support_chat_count}")
        self.stdout.write(f"- Арбитражные дела: {arb_case_count}")
        self.stdout.write(f"- Арбитражные сообщения: {arb_msg_count}")
        self.stdout.write(f"- Арбитражная активность: {arb_act_count}")
        self.stdout.write(f"- Претензии (арбитраж): {complaint_count}")
        self.stdout.write(f"- Претензии (поддержка): {claim_count}")
        self.stdout.write(f"- Сообщения претензий: {claim_msg_count}")

        if dry_run:
            self.stdout.write(self.style.WARNING("Dry-run: удаление не выполнялось"))
            return

        if not confirmed:
            raise CommandError("Для удаления передайте флаг --yes")

        with transaction.atomic():
            # Арбитраж (сообщения и активность удалятся каскадно с дела)
            deleted_arb_act = ArbitrationActivity.objects.all().delete()
            deleted_arb_msg = ArbitrationMessage.objects.all().delete()
            deleted_complaint = Complaint.objects.all().delete()
            deleted_arb_case = ArbitrationCase.objects.all().delete()

            # Претензии поддержки (сообщения удалятся каскадно)
            deleted_claim_msg = ClaimMessage.objects.all().delete()
            deleted_claim = Claim.objects.all().delete()

            # Чаты и заказы (транзакции, ставки удалятся каскадно с заказов)
            deleted_chat_result = Chat.objects.all().delete()
            deleted_order_result = Order.objects.all().delete()
            deleted_support_result = (0, {})
            if not no_support:
                deleted_support_result = SupportChat.objects.all().delete()

        self.stdout.write(self.style.SUCCESS("Очистка завершена"))
        self.stdout.write(f"- Арбитражные дела: {deleted_arb_case}")
        self.stdout.write(f"- Арбитражные сообщения: {deleted_arb_msg}")
        self.stdout.write(f"- Арбитражная активность: {deleted_arb_act}")
        self.stdout.write(f"- Претензии (арбитраж): {deleted_complaint}")
        self.stdout.write(f"- Сообщения претензий: {deleted_claim_msg}")
        self.stdout.write(f"- Претензии (поддержка): {deleted_claim}")
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
        self.stdout.write(f"- Арбитражные дела: {ArbitrationCase.objects.count()}")
        self.stdout.write(f"- Претензии (арбитраж): {Complaint.objects.count()}")
        self.stdout.write(f"- Претензии (поддержка): {Claim.objects.count()}")
