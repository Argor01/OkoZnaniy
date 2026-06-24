from django.core.management.base import BaseCommand

from apps.catalog.models import WorkType


DEFAULT_WORK_TYPES = [
    {"name": "Курсовая работа", "base_price": 3000, "estimated_time": 72},
    {"name": "Дипломная работа (ВКР)", "base_price": 15000, "estimated_time": 240},
    {"name": "Реферат", "base_price": 500, "estimated_time": 8},
    {"name": "Доклад", "base_price": 400, "estimated_time": 6},
    {"name": "Эссе", "base_price": 600, "estimated_time": 8},
    {"name": "Лабораторная работа", "base_price": 800, "estimated_time": 12},
    {"name": "Практическое задание", "base_price": 700, "estimated_time": 10},
    {"name": "Контрольная работа", "base_price": 1000, "estimated_time": 16},
    {"name": "Тест", "base_price": 300, "estimated_time": 2},
    {"name": "Зачётная работа", "base_price": 1500, "estimated_time": 24},
    {"name": "Проектная работа", "base_price": 2500, "estimated_time": 48},
    {"name": "Отчёт по практике", "base_price": 2000, "estimated_time": 36},
    {"name": "Расчётно-графическая работа", "base_price": 1800, "estimated_time": 30},
    {"name": "Домашняя работа", "base_price": 400, "estimated_time": 6},
    {"name": "Индивидуальное задание", "base_price": 900, "estimated_time": 14},
    {"name": "Презентация", "base_price": 600, "estimated_time": 8},
    {"name": "Модульная работа", "base_price": 1200, "estimated_time": 20},
    {"name": "Бизнес-план", "base_price": 3500, "estimated_time": 60},
    {"name": "Чертёж или графическое задание", "base_price": 1500, "estimated_time": 24},
    {"name": "Компьютерное моделирование", "base_price": 2000, "estimated_time": 36},
    {"name": "Социальный или творческий проект", "base_price": 2200, "estimated_time": 40},
]


class Command(BaseCommand):
    help = "Восстанавливает стандартный список типов работ в каталоге"

    def handle(self, *args, **options):
        created_count = 0
        updated_count = 0

        for item in DEFAULT_WORK_TYPES:
            _, created = WorkType.objects.update_or_create(
                name=item["name"],
                defaults={
                    "base_price": item["base_price"],
                    "estimated_time": item["estimated_time"],
                    "is_active": True,
                },
            )
            if created:
                created_count += 1
            else:
                updated_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Готово: создано {created_count}, обновлено {updated_count}, всего {WorkType.objects.count()} типов работ."
            )
        )
