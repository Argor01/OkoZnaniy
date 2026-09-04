"""Демо-витрина: 8 экспертов с примерно одинаковым рейтингом (4.7–4.9).

Создаёт согласованные данные, которые видны на всех витринах профиля:
  - пользователь-эксперт (роль expert, верифицирован, анкета одобрена);
  - 1–2 специализации по реальным предметам каталога;
  - статистика эксперта (рейтинг, число отзывов, выполненные заказы);
  - настоящие отзывы (ExpertReview), каждый привязан к завершённому заказу
    и написан одним из демо-клиентов, чтобы рейтинг был реальным.

Всё помечено доменом e-mail ``@showcase.okoznaniy.local`` и легко удаляется:
    python manage.py seed_showcase_experts --delete

Повторный запуск без --delete ничего не дублирует (idempotent).
Пересоздать с нуля:
    python manage.py seed_showcase_experts --reset
"""

import random
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.catalog.models import Subject
from apps.experts.models import ExpertReview, ExpertStatistics, Specialization
from apps.orders.models import Order

User = get_user_model()

DEMO_DOMAIN = "showcase.okoznaniy.local"
DEMO_TAG = "[demo-showcase]"

# (имя, фамилия, город, опыт лет, ставка, [ключевые слова предметов], bio, образование, навыки)
EXPERTS = [
    ("Анна", "Петрова", "Москва", 9, 1200,
     ["Высшая математика", "Алгебра", "математик"],
     "Преподаватель высшей математики. Помогаю разобраться в матанализе, линейной алгебре и теории вероятностей — от контрольных до курсовых.",
     "МГУ им. Ломоносова, механико-математический факультет",
     "Матанализ, линейная алгебра, теория вероятностей, дифференциальные уравнения"),
    ("Дмитрий", "Соколов", "Санкт-Петербург", 12, 1500,
     ["Программирование", "Базы данных", "информат"],
     "Senior-разработчик. Веду проекты и учебные работы по Python, Java и SQL: от лабораторных до дипломов с реальным кодом.",
     "СПбГУ ИТМО, факультет программной инженерии",
     "Python, Java, SQL, проектирование БД, алгоритмы"),
    ("Елена", "Кузнецова", "Казань", 7, 900,
     ["Английский язык", "английск", "лингвист"],
     "Дипломированный лингвист, C2. Перевод, эссе, презентации и подготовка к экзаменам IELTS/TOEFL.",
     "КФУ, Институт международных отношений",
     "Академический английский, перевод, IELTS, TOEFL, деловая переписка"),
    ("Игорь", "Волков", "Новосибирск", 11, 1300,
     ["Экономика", "Финансы", "эконом"],
     "Экономист-аналитик. Курсовые и дипломы по микро/макроэкономике, финансовому анализу и бизнес-планированию.",
     "НГУ, экономический факультет",
     "Микроэкономика, финансовый анализ, эконометрика, бизнес-планирование"),
    ("Мария", "Смирнова", "Екатеринбург", 8, 1100,
     ["Юриспруденция", "право", "юрид"],
     "Практикующий юрист. Помогаю с работами по гражданскому, трудовому и корпоративному праву с актуальной судебной практикой.",
     "УрГЮУ, юридический факультет",
     "Гражданское право, трудовое право, корпоративное право, процесс"),
    ("Алексей", "Морозов", "Нижний Новгород", 10, 1000,
     ["Физика", "физик"],
     "Кандидат физ.-мат. наук. Механика, электродинамика, квантовая физика — понятно и с подробным решением.",
     "ННГУ им. Лобачевского, физический факультет",
     "Механика, электродинамика, квантовая физика, лабораторные работы"),
    ("Ольга", "Новикова", "Ростов-на-Дону", 6, 850,
     ["Психология", "психолог"],
     "Психолог-консультант. Работы по общей, возрастной и социальной психологии, эмпирические исследования и обработка данных.",
     "ЮФУ, факультет психологии",
     "Общая психология, возрастная психология, методология исследований, SPSS"),
    ("Сергей", "Лебедев", "Краснодар", 13, 1400,
     ["Менеджмент", "Маркетинг", "управлен"],
     "MBA, консультант по управлению. Стратегия, маркетинг и управление проектами — с кейсами и расчётами.",
     "Kuban State University, программа MBA",
     "Стратегический менеджмент, маркетинг, управление проектами, кейс-анализ"),
]

CLIENTS = [
    ("Виктор", "Егоров"),
    ("Наталья", "Орлова"),
    ("Павел", "Григорьев"),
    ("Ирина", "Фомина"),
    ("Роман", "Тихонов"),
    ("Светлана", "Белова"),
]

COMMENTS_5 = [
    "Работа выполнена раньше срока, всё по методичке. Спасибо!",
    "Отличный эксперт, объяснил все непонятные моменты. Рекомендую.",
    "Сдал на отлично, преподаватель вопросов не задал.",
    "Очень внимательно отнёсся к требованиям, правки внёс быстро.",
    "Всё чётко и по делу, буду обращаться ещё.",
    "Качество на высоте, оформление идеальное.",
    "Помог в последний момент, спас ситуацию. Огромное спасибо!",
    "Грамотно, аккуратно, без воды. Пять баллов.",
    "Лучший специалист, с которым работала на площадке.",
    "Всё понятно расписано, разобрался в теме благодаря эксперту.",
]
COMMENTS_4 = [
    "Хорошая работа, пара мелких правок — но всё поправили.",
    "В целом доволен, сдал без проблем.",
    "Нормально, по срокам чуть задержали, но результат хороший.",
    "Работа солидная, немного не хватило деталей в одном разделе.",
]

WORK_TYPES = ["Курсовая работа", "Реферат", "Контрольная работа", "Эссе", "Лабораторная работа", "Дипломная работа"]


class Command(BaseCommand):
    help = "Создаёт 8 демо-профилей экспертов с рейтингом 4.7–4.9 и отзывами."

    def add_arguments(self, parser):
        parser.add_argument("--delete", action="store_true", help="Удалить все демо-данные витрины и выйти.")
        parser.add_argument("--reset", action="store_true", help="Удалить и создать заново.")

    def handle(self, *args, **opts):
        if opts["delete"] or opts["reset"]:
            self._delete()
            if opts["delete"]:
                return

        with transaction.atomic():
            clients = self._ensure_clients()
            subjects = list(Subject.objects.all())
            if not subjects:
                self.stderr.write("В каталоге нет предметов — сначала заполните каталог.")
                return
            for idx, data in enumerate(EXPERTS):
                self._make_expert(idx, data, clients, subjects)

        self._report()

    # ------------------------------------------------------------------ helpers
    def _demo_email(self, handle):
        return f"{handle}@{DEMO_DOMAIN}"

    def _delete(self):
        qs = User.objects.filter(email__endswith=f"@{DEMO_DOMAIN}")
        n = qs.count()
        # заказы демо-клиентов удалятся каскадом (client=CASCADE), с ними отзывы;
        # специализации/статистика экспертов — тоже каскадом.
        qs.delete()
        self.stdout.write(self.style.WARNING(f"Удалено демо-пользователей: {n} (заказы/отзывы/специализации — каскадом)."))

    def _ensure_clients(self):
        clients = []
        for i, (fn, ln) in enumerate(CLIENTS):
            handle = f"demo_client_{i+1}"
            u, _ = User.objects.get_or_create(
                email=self._demo_email(handle),
                defaults=dict(
                    username=f"{fn} {ln}", has_custom_username=True, role="client",
                    first_name=fn, last_name=ln, is_active=True, email_verified=True,
                ),
            )
            clients.append(u)
        return clients

    def _pick_subjects(self, keywords, all_subjects):
        found = []
        for kw in keywords:
            m = Subject.objects.filter(name__icontains=kw).first()
            if m and m not in found:
                found.append(m)
        if not found:
            found = random.sample(all_subjects, k=min(2, len(all_subjects)))
        return found[:2]

    def _make_expert(self, idx, data, clients, all_subjects):
        fn, ln, city, exp, rate, kws, bio, edu, skills = data
        handle = f"demo_expert_{idx+1}"
        email = self._demo_email(handle)

        expert, created = User.objects.get_or_create(
            email=email,
            defaults=dict(
                username=f"{fn} {ln}", has_custom_username=True, role="expert",
                first_name=fn, last_name=ln, is_active=True, email_verified=True,
                is_verified=True, bio=bio, experience_years=exp,
                hourly_rate=Decimal(rate), education=edu, skills=skills, city=city,
                has_submitted_application=True, application_approved=True,
                application_submitted_at=timezone.now() - timedelta(days=random.randint(120, 400)),
                application_reviewed_at=timezone.now() - timedelta(days=random.randint(100, 119)),
            ),
        )
        if not created and expert.reviews.exists():
            self.stdout.write(f"  = {fn} {ln}: уже создан, пропуск.")
            return

        # специализации
        subjects = self._pick_subjects(kws, all_subjects)
        for subj in subjects:
            Specialization.objects.get_or_create(
                expert=expert, subject=subj,
                defaults=dict(
                    experience_years=exp, hourly_rate=Decimal(rate),
                    description=bio, skills=skills, is_verified=True,
                ),
            )

        # целевой рейтинг 4.7–4.9
        target = random.choice([Decimal("4.7"), Decimal("4.75"), Decimal("4.8"), Decimal("4.85"), Decimal("4.9")])
        n_reviews = random.randint(12, 18)
        fours = round(n_reviews * float(Decimal("5") - target))
        fours = max(0, min(fours, n_reviews))
        fives = n_reviews - fours
        ratings = [5] * fives + [4] * fours
        random.shuffle(ratings)

        # отзывы + завершённые заказы под них
        for rating in ratings:
            client = random.choice(clients)
            subj = random.choice(subjects)
            days_ago = random.randint(5, 300)
            order = Order.objects.create(
                client=client, expert=expert, subject=subj,
                title=f"{DEMO_TAG} {random.choice(WORK_TYPES)} по предмету «{subj.name}»",
                description="Демо-заказ витрины (для отображения отзывов и рейтинга).",
                status="completed", budget=Decimal(random.randint(1500, 9000)),
                deadline=timezone.now() + timedelta(days=random.randint(1, 30)),
            )
            comment = random.choice(COMMENTS_5 if rating == 5 else COMMENTS_4)
            rev = ExpertReview.objects.create(
                expert=expert, order=order, client=client, rating=rating,
                comment=comment, is_published=True,
            )
            # разносим даты, чтобы лента отзывов выглядела естественно
            created_at = timezone.now() - timedelta(days=days_ago, hours=random.randint(0, 23))
            ExpertReview.objects.filter(pk=rev.pk).update(created_at=created_at)

        # несколько завершённых заказов без отзыва (реалистично: не все оставляют отзыв)
        extra_completed = random.randint(2, 6)
        for _ in range(extra_completed):
            Order.objects.create(
                client=random.choice(clients), expert=expert, subject=random.choice(subjects),
                title=f"{DEMO_TAG} {random.choice(WORK_TYPES)}",
                description="Демо-заказ витрины.", status="completed",
                budget=Decimal(random.randint(1500, 9000)),
                deadline=timezone.now() + timedelta(days=random.randint(1, 30)),
            )

        # статистика (рейтинг/кол-во отзывов уже проставил сигнал ExpertReview)
        stats, _ = ExpertStatistics.objects.get_or_create(expert=expert)
        completed = n_reviews + extra_completed
        stats.total_orders = completed + random.randint(0, 3)
        stats.completed_orders = completed
        stats.success_rate = round(Decimal(completed) / Decimal(stats.total_orders) * 100, 2)
        stats.total_earnings = Decimal(random.randint(80000, 300000))
        stats.save()

        stats.refresh_from_db()
        self.stdout.write(self.style.SUCCESS(
            f"  + {fn} {ln} ({city}): рейтинг {stats.average_rating}, отзывов {stats.total_ratings}, заказов {completed}"
        ))

    def _report(self):
        experts = User.objects.filter(email__endswith=f"@{DEMO_DOMAIN}", role="expert").count()
        reviews = ExpertReview.objects.filter(expert__email__endswith=f"@{DEMO_DOMAIN}").count()
        self.stdout.write(self.style.SUCCESS(
            f"\nГотово. Демо-экспертов: {experts}, отзывов всего: {reviews}."
        ))
