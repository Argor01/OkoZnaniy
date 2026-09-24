from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.catalog.models import Subject
from apps.experts.models import ExpertApplication, ExpertStatistics, Specialization


PASSWORD = "DemoOko2026!"


PROFILES = [
    # username, role, first name, last name, city
    ("demo_director_01", "director", "Александр", "Орлов", "Москва"),
    ("demo_director_02", "director", "Елена", "Соколова", "Санкт-Петербург"),
    ("demo_admin_01", "admin", "Ирина", "Морозова", "Москва"),
    ("demo_admin_02", "admin", "Михаил", "Лебедев", "Казань"),
    ("demo_admin_03", "admin", "Ольга", "Кузнецова", "Новосибирск"),
    ("demo_expert_01", "expert", "Анна", "Волкова", "Москва"),
    ("demo_expert_02", "expert", "Дмитрий", "Фёдоров", "Санкт-Петербург"),
    ("demo_expert_03", "expert", "Мария", "Никитина", "Екатеринбург"),
    ("demo_expert_04", "expert", "Сергей", "Попов", "Казань"),
    ("demo_client_01", "client", "Иван", "Петров", "Москва"),
    ("demo_client_02", "client", "Мария", "Иванова", "Санкт-Петербург"),
    ("demo_client_03", "client", "Алексей", "Смирнов", "Новосибирск"),
    ("demo_client_04", "client", "Наталья", "Васильева", "Казань"),
    ("demo_partner_01", "partner", "Роман", "Крылов", "Москва"),
    ("demo_partner_02", "partner", "Татьяна", "Белова", "Екатеринбург"),
]

EXPERT_RATINGS = {
    "demo_expert_01": Decimal("4.80"),
    "demo_expert_02": Decimal("4.75"),
    "demo_expert_03": Decimal("4.70"),
    "demo_expert_04": Decimal("4.85"),
}


class Command(BaseCommand):
    help = "Создаёт/обновляет демо-профили: 2 директора, 3 админа, 4 эксперта, 4 клиента и 2 партнёра."

    @transaction.atomic
    def handle(self, *args, **options):
        User = get_user_model()
        users = {}
        created_count = 0
        updated_count = 0

        for username, role, first_name, last_name, city in PROFILES:
            email = f"{username}@demo.okoznaniy.test"
            defaults = {
                "email": email,
                "role": role,
                "first_name": first_name,
                "last_name": last_name,
                "city": city,
                "is_active": True,
                "email_verified": True,
                "has_custom_username": True,
                "is_staff": role in {"admin", "director"},
                "is_superuser": False,
            }
            user, created = User.objects.update_or_create(
                username=username,
                defaults=defaults,
            )
            user.set_password(PASSWORD)
            user.save(update_fields=["password"])
            users[username] = user
            if created:
                created_count += 1
            else:
                updated_count += 1

        subject = Subject.objects.filter(is_active=True).order_by("id").first()
        specialization_count = 0
        if subject:
            for username, rating in EXPERT_RATINGS.items():
                expert = users[username]
                specialization = Specialization.objects.filter(expert=expert).order_by("id").first()
                if specialization is None:
                    specialization = Specialization(expert=expert)
                specialization.subject = subject
                specialization.experience_years = 5
                specialization.hourly_rate = Decimal("1800.00")
                specialization.description = "Демо-профиль эксперта для проверки каталога и рейтингов."
                specialization.skills = "Консультации, анализ, подготовка материалов"
                specialization.is_verified = True
                specialization.verified_by = users["demo_director_01"]
                specialization.save()
                specialization_count += 1

                application, _ = ExpertApplication.objects.get_or_create(
                    expert=expert,
                    defaults={
                        "full_name": f"{expert.first_name} {expert.last_name}",
                        "work_experience_years": 5,
                    },
                )
                application.full_name = f"{expert.first_name} {expert.last_name}"
                application.work_experience_years = 5
                application.status = "approved"
                application.reviewed_by = users["demo_director_01"]
                application.save()
                application.specializations.set([subject])

                stats, _ = ExpertStatistics.objects.get_or_create(expert=expert)
                stats.average_rating = rating
                stats.total_ratings = 20
                stats.total_orders = 25
                stats.completed_orders = 24
                stats.success_rate = Decimal("96.00")
                stats.save()
        else:
            self.stdout.write(self.style.WARNING("Активных предметов нет: специализации экспертов не добавлены."))

        self.stdout.write(self.style.SUCCESS(
            f"Готово: создано {created_count}, обновлено {updated_count}, "
            f"специализаций экспертов: {specialization_count}."
        ))
        self.stdout.write(f"Общий пароль демо-профилей: {PASSWORD}")
        self.stdout.write("Логины:")
        for username, role, *_ in PROFILES:
            self.stdout.write(f"  {username} ({role})")
