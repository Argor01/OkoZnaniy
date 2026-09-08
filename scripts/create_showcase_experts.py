# -*- coding: utf-8 -*-
"""Создаёт витринные аккаунты экспертов с историей заказов и отзывами.

Запуск внутри контейнера бэкенда:
  python manage.py shell < scripts/create_showcase_experts.py
Или: docker exec okoznaniy-backend-1 python /app/scripts/create_showcase_experts.py
(c скриптом через exec(open(...)) — идемпотентен по username).

Для каждого эксперта создаёт: пользователя (role=expert, is_verified),
ExpertStatistics, выполненные заказы от демо-клиентов и отзывы клиентов.
Статистика пересчитывается из фактически созданных записей, рейтинги
не противоречат отзывам — числа в профиле сходятся со списком отзывов.
"""
import os
import random
import sys
from datetime import timedelta
from decimal import Decimal

import django

sys.path.insert(0, '/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import transaction
from django.utils import timezone

from apps.catalog.models import Subject, WorkType
from apps.experts.models import ExpertStatistics
from apps.orders.models import ClientReview, Order
from apps.users.models import User

random.seed(20260909)

PASSWORD = 'OkoExpert2026!'

EXPERTS = [
    {
        'username': 'anna.morozova', 'first_name': 'Анна', 'last_name': 'Морозова',
        'email': 'anna.morozova@okoznaniy.team', 'city': 'Москва',
        'education': 'МГУ им. М.В. Ломоносова, экономический факультет, магистратура',
        'bio': 'Экономист-практик. Специализируюсь на курсовых и дипломных по экономике, '
               'финансам и бухгалтерскому учёту. Всегда довожу работу до защиты.',
        'skills': 'Экономика, Финансы, Бухучёт, Анализ данных, Excel',
        'experience_years': 6, 'orders': 18, 'rating_target': 4.9,
    },
    {
        'username': 'dmitry.sokolov', 'first_name': 'Дмитрий', 'last_name': 'Соколов',
        'email': 'dmitry.sokolov@okoznaniy.team', 'city': 'Санкт-Петербург',
        'education': 'СПбГУ, математико-механический факультет',
        'bio': 'Математика и программирование: от контрольных до выпускных квалификационных. '
               'Помогаю с задачами, чертежами и онлайн-помощью на экзаменах.',
        'skills': 'Математика, Python, C++, Статистика, Теория вероятностей',
        'experience_years': 8, 'orders': 24, 'rating_target': 4.8,
    },
    {
        'username': 'elena.kuznetsova', 'first_name': 'Елена', 'last_name': 'Кузнецова',
        'email': 'elena.kuznetsova@okoznaniy.team', 'city': 'Казань',
        'education': 'КФУ, институт филологии и межкультурной коммуникации',
        'bio': 'Филолог, пишу эссе, рефераты и дипломные по литературе, русскому и '
               'английскому языку. Аккуратное оформление по ГОСТу — по умолчанию.',
        'skills': 'Русский язык, Литература, Английский язык, Эссе, Редактура',
        'experience_years': 5, 'orders': 14, 'rating_target': 5.0,
    },
    {
        'username': 'sergey.volkov', 'first_name': 'Сергей', 'last_name': 'Волков',
        'email': 'sergey.volkov@okoznaniy.team', 'city': 'Новосибирск',
        'education': 'НГУ, механико-математический факультет',
        'bio': 'Инженерные дисциплины: техническая механика, сопромат, чертежи в '
               'AutoCAD и Компас. Отчёты по практике с расчётной частью.',
        'skills': 'Чертежи, AutoCAD, Сопромат, Физика, Отчёты по практике',
        'experience_years': 9, 'orders': 21, 'rating_target': 4.7,
    },
    {
        'username': 'olga.pavlova', 'first_name': 'Ольга', 'last_name': 'Павлова',
        'email': 'olga.pavlova@okoznaniy.team', 'city': 'Екатеринбург',
        'education': 'УрГЮУ, юридический факультет',
        'bio': 'Юрист. Курсовые и дипломы по гражданскому, трудовому и уголовному праву, '
               'юридический анализ документов и судебная практика.',
        'skills': 'Право, Гражданское право, Трудовое право, Анализ судебной практики',
        'experience_years': 7, 'orders': 16, 'rating_target': 4.9,
    },
]

CLIENT_NAMES = [
    'Мария И.', 'Алексей К.', 'Ирина С.', 'Павел Д.', 'Наталья В.',
    'Роман Т.', 'Светлана Б.', 'Кирилл Ж.', 'Дарья Л.', 'Максим Ф.',
    'Юлия Г.', 'Артём Н.', 'Виктория Ч.', 'Никита О.', 'Оксана Р.',
]

REVIEWS_5 = [
    'Работа выполнена раньше срока, всё оформление по требованиям. Защитилась на отлично!',
    'Очень выручили с горящими сроками, качество на высоте. Рекомендую!',
    'Автор всегда на связи, все правки внес в тот же день. Спасибо огромное!',
    'Уникальность прошла с первого раза, руководитель не придрался ни к чему.',
    'Всё чётко и по теме, без воды. Буду обращаться ещё.',
    'Сложная тема раскрыта простым языком, преподаватель похвалил. Спасибо!',
]
REVIEWS_4 = [
    'Хорошая работа, были небольшие замечания по оформлению, быстро исправили.',
    'В целом всё устраивает, пару раз приходилось уточнять детали.',
    'Работой довольна, но сроки поджимали — хотелось чуть раньше.',
]
TITLES = {
    'course': 'Курсовая работа по теме «{topic}»',
    'diploma': 'Дипломная работа по теме «{topic}»',
    'essay': 'Реферат на тему «{topic}»',
    'task': 'Решение задач по теме «{topic}»',
}
TOPICS = {
    'Экономика': ['влияние инфляции на сберегательное поведение', 'цифровизация банковского сектора'],
    'Математика': ['численные методы решения дифференциальных уравнений', 'применение теории графов в логистике'],
    'Английский язык': ['лингвостилистические особенности деловой переписки', 'заимствования в современном английском'],
    'Физика': ['расчёт балочных конструкций методом сечений', 'энергетический подход к анализу механизмов'],
    'Право': ['договорная работа в IT-секторе', 'защита прав потребителей в онлайн-торговле'],
    'Бухгалтерский учёт': ['учётная политика малого предприятия', 'аудит расчётов с персоналом'],
}


def pick(dct):
    subject = random.choice(list(dct.keys()))
    topic = random.choice(dct[subject])
    return subject, topic


@transaction.atomic
def run():
    subjects = {s.name: s for s in Subject.objects.all()}
    worktypes = {w.name: w for w in WorkType.objects.all()}

    def find_subject(names):
        for n in names:
            if n in subjects:
                return subjects[n]
        # мягкое совпадение по подстроке
        for have in subjects:
            for n in names:
                if n.lower() in have.lower():
                    return subjects[have]
        return None

    subj_map = {
        'Экономика': find_subject(['Экономика', 'Экономическая теория']),
        'Математика': find_subject(['Математика', 'Высшая математика', 'Математический анализ']),
        'Английский язык': find_subject(['Английский язык']),
        'Физика': find_subject(['Физика', 'Техническая механика']),
        'Право': find_subject(['Право', 'Правоведение', 'Гражданское право']),
        'Бухгалтерский учёт': find_subject(['Бухгалтерский учёт', 'Бухучёт']),
    }
    worktype = None
    for want in ['Курсовая работа', 'Курсовая', 'Дипломная работа (вкр)', 'Доклад', 'Реферат']:
        if want in worktypes:
            worktype = worktypes[want]
            break
    if worktype is None:
        worktype = list(worktypes.values())[0]

    # демо-клиенты, от которых пойдут отзывы
    clients = []
    for i, name in enumerate(CLIENT_NAMES):
        uname = 'demo.client.%02d' % (i + 1)
        client = User.objects.filter(username=uname).first()
        if client is None:
            client = User.objects.create_user(
                username=uname, email='demo.client.%02d@okoznaniy.test' % (i + 1),
                password=__import__('django.utils.crypto', fromlist=['get_random_string']).get_random_string(16), role='client',
                first_name=name.split()[0], last_name=name.split()[-1].rstrip('.'),
            )
        clients.append(client)

    created_experts = []
    for spec in EXPERTS:
        expert = User.objects.filter(username=spec['username']).first()
        if expert is None:
            expert = User.objects.create_user(
                username=spec['username'], email=spec['email'], password=PASSWORD,
                role='expert', first_name=spec['first_name'], last_name=spec['last_name'],
                city=spec['city'], education=spec['education'], bio=spec['bio'],
                skills=spec['skills'], experience_years=spec['experience_years'],
            )
        expert.role = 'expert'
        expert.is_verified = True
        if not expert.education:
            expert.education = spec['education']
        if not expert.bio:
            expert.bio = spec['bio']
        expert.save()

        existing_orders = Order.objects.filter(expert=expert, status='completed').count()
        need = max(0, spec['orders'] - existing_orders)
        now = timezone.now()

        ratings = []
        for i in range(need):
            subj_name, topic = pick(TOPICS)
            subject = subj_map.get(subj_name)
            wtype = worktype
            title = TITLES['course'].format(topic=topic)
            created = now - timedelta(days=random.randint(10, 400), hours=random.randint(0, 20))
            budget = Decimal(random.choice([1000, 1200, 1500, 2000, 2500, 3000, 4000, 5000, 6500, 8000]))
            deadline_real = created + timedelta(days=random.randint(3, 14))
            order = Order.objects.create(
                client=random.choice(clients),
                expert=expert,
                subject=subject,
                work_type=wtype,
                title=title,
                description='Учебное задание: %s. Требования к оформлению и уникальности соблюдены.' % topic,
                deadline=now + timedelta(days=7),
                budget=budget,
                status='completed',
            )
            # исторические даты — через update(), минуя валидацию save()
            Order.objects.filter(pk=order.pk).update(
                deadline=deadline_real, created_at=created, updated_at=created,
            )
            # отзыв почти на каждый заказ, рейтинг около целевого
            leave_review = random.random() < 0.9
            if leave_review:
                drift = random.random()
                rating = 5 if spec['rating_target'] >= 4.9 or drift > 0.25 else 4
                pool = REVIEWS_5 if rating == 5 else REVIEWS_4
                ClientReview.objects.create(
                    order=order, expert=expert, client=order.client,
                    rating=rating, comment=random.choice(pool),
                    created_at=created + timedelta(days=random.randint(2, 6)),
                )
                ratings.append(rating)

        stats, _ = ExpertStatistics.objects.get_or_create(expert=expert)
        completed = Order.objects.filter(expert=expert, status='completed').count()
        total = Order.objects.filter(expert=expert).count()
        from django.db.models import Avg, Count
        agg = ClientReview.objects.filter(expert=expert).aggregate(avg=Avg('rating'), n=Count('id'))
        avg = agg['avg'] or 0
        stats.total_orders = total
        stats.completed_orders = completed
        stats.average_rating = Decimal(str(round(avg, 2)))
        stats.total_ratings = agg['n']
        stats.success_rate = Decimal('100.00') if completed else Decimal('0')
        stats.total_earnings = sum(
            (o.budget or Decimal('0')) for o in Order.objects.filter(expert=expert, status='completed')
        )
        stats.save()

        created_experts.append((spec['username'], completed, agg['n'], round(float(avg), 2)))

    print('PASSWORD общий для экспертов: %s' % PASSWORD)
    print('%-22s %-9s %-9s %s' % ('username', 'заказов', 'отзывов', 'рейтинг'))
    for uname, orders_n, rev_n, avg in created_experts:
        print('%-22s %-9d %-9d %.2f' % (uname, orders_n, rev_n, avg))


if __name__ == '__main__' or True:
    run()
