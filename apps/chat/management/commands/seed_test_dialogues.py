import random
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from apps.chat.models import Chat, Message

User = get_user_model()

EXTRA_CLIENTS = [
    {'username': 'anna_k', 'first_name': 'Анна', 'last_name': 'Козлова', 'email': 'anna@test.com'},
    {'username': 'sergey_m', 'first_name': 'Сергей', 'last_name': 'Михайлов', 'email': 'sergey@test.com'},
    {'username': 'elena_v', 'first_name': 'Елена', 'last_name': 'Волкова', 'email': 'elena@test.com'},
    {'username': 'dmitry_n', 'first_name': 'Дмитрий', 'last_name': 'Новиков', 'email': 'dmitry@test.com'},
    {'username': 'maria_s', 'first_name': 'Мария', 'last_name': 'Соколова', 'email': 'maria@test.com'},
    {'username': 'alexey_p', 'first_name': 'Алексей', 'last_name': 'Петров', 'email': 'alexey@test.com'},
    {'username': 'olga_t', 'first_name': 'Ольга', 'last_name': 'Тимофеева', 'email': 'olga@test.com'},
    {'username': 'nikita_b', 'first_name': 'Никита', 'last_name': 'Борисов', 'email': 'nikita@test.com'},
    {'username': 'kate_l', 'first_name': 'Екатерина', 'last_name': 'Лебедева', 'email': 'kate@test.com'},
    {'username': 'pavel_r', 'first_name': 'Павел', 'last_name': 'Романов', 'email': 'pavel@test.com'},
]

EXTRA_EXPERTS = [
    {'username': 'expert_anna', 'first_name': 'Анна', 'last_name': 'Экспертова', 'email': 'expert_anna@test.com'},
    {'username': 'expert_sergey', 'first_name': 'Сергей', 'last_name': 'Профи', 'email': 'expert_sergey@test.com'},
    {'username': 'expert_elena', 'first_name': 'Елена', 'last_name': 'Знатокова', 'email': 'expert_elena@test.com'},
    {'username': 'expert_dmitry', 'first_name': 'Дмитрий', 'last_name': 'Мастеров', 'email': 'expert_dmitry@test.com'},
    {'username': 'expert_maria', 'first_name': 'Мария', 'last_name': 'Консультант', 'email': 'expert_maria@test.com'},
    {'username': 'expert_alexey', 'first_name': 'Алексей', 'last_name': 'Специалист', 'email': 'expert_alexey@test.com'},
    {'username': 'expert_olga', 'first_name': 'Ольга', 'last_name': 'Аналитик', 'email': 'expert_olga@test.com'},
    {'username': 'expert_nikita', 'first_name': 'Никита', 'last_name': 'Разработчик', 'email': 'expert_nikita@test.com'},
    {'username': 'expert_kate', 'first_name': 'Екатерина', 'last_name': 'Дизайнер', 'email': 'expert_kate@test.com'},
    {'username': 'expert_pavel', 'first_name': 'Павел', 'last_name': 'Менеджер', 'email': 'expert_pavel@test.com'},
]

DIALOGUES = [
    {
        'title': 'Помощь с курсовой по математике',
        'messages': [
            ('client', 'Здравствуйте! Нужна помощь с курсовой по линейной алгебре.'),
            ('expert', 'Добрый день! Какая тема курсовой?'),
            ('client', 'Матрицы и определители. Нужно решить 15 задач.'),
            ('expert', 'Хорошо, могу помочь. Скиньте условия задач.'),
            ('client', 'Отправляю в следующем сообщении.'),
            ('expert', 'Принял, посмотрю и скажу сроки.'),
        ],
    },
    {
        'title': 'Редактирование эссе по литературе',
        'messages': [
            ('expert', 'Здравствуйте! Я получил ваше эссе на проверку.'),
            ('client', 'Да, жду замечаний.'),
            ('expert', 'Есть несколько ошибок в структуре. Вступление слишком длинное.'),
            ('client', 'Понял, могу сократить. Что ещё?'),
            ('expert', 'В третьей главе нужно добавить больше примеров из текста.'),
            ('client', 'Хорошо, сделаю. Спасибо!'),
        ],
    },
    {
        'title': 'Перевод статьи с английского',
        'messages': [
            ('client', 'Нужен перевод статьи на русский, 20 страниц.'),
            ('expert', 'Какая тема статьи?'),
            ('client', 'По информатике, машинное обучение.'),
            ('expert', 'Хорошо, возьмусь. Стоимость 3000 руб.'),
            ('client', 'Договорились. Сроки?'),
            ('expert', '3 рабочих дня.'),
        ],
    },
    {
        'title': 'Написание бизнес-плана',
        'messages': [
            ('client', 'Здравствуйте! Нужен бизнес-план для открытия кофейни.'),
            ('expert', 'Добрый день! Расскажите подробнее о концепции.'),
            ('client', 'Маленькая кофейня в центре города, 15 посадочных мест.'),
            ('expert', 'Понял. Нужен полный расчёт с финансовыми показателями?'),
            ('client', 'Да, полный. Включая окупаемость.'),
            ('expert', 'Стоимость 5000 руб, срок 5 дней.'),
            ('client', 'Отлично, начинаю.'),
        ],
    },
    {
        'title': 'Консультация по физике',
        'messages': [
            ('client', 'Не могу разобраться с задачами по термодинамике.'),
            ('expert', 'Какие именно задачи? Скиньте фото.'),
            ('client', 'Те, что на стр 45 в учебнике Савельева.'),
            ('expert', 'Вижу. Задача 3 решается через первый закон.'),
            ('client', 'А задача 5?'),
            ('expert', 'Там нужен графический метод, объясню пошагово.'),
        ],
    },
    {
        'title': 'Дипломная работа по экономике',
        'messages': [
            ('expert', 'Здравствуйте! Начнём работу над дипломной.'),
            ('client', 'Да, у меня готов план и введение.'),
            ('expert', 'Отлично. Скиньте, посмотрю.'),
            ('client', 'Отправляю файл.'),
            ('expert', 'План хороший, но нужно добавить главу о digital-маркетинге.'),
            ('client', 'Согласен. Через сколько будет готова первая глава?'),
            ('expert', 'На написание каждой главы уходит 2-3 дня.'),
        ],
    },
    {
        'title': 'Помощь с программированием на Python',
        'messages': [
            ('client', 'Здравствуйте! Нужна помощь с парсером на Python.'),
            ('expert', 'Какой сайт парсим?'),
            ('client', 'Интернет-магазин, нужно выгрузить цены.'),
            ('expert', 'Используем BeautifulSoup или Selenium?'),
            ('client', 'Не знаю, что лучше.'),
            ('expert', 'Для динамического контента — Selenium.'),
            ('client', 'Хорошо, давайте Selenium.'),
        ],
    },
    {
        'title': 'Разработка ТЗ на сайт',
        'messages': [
            ('client', 'Нужно техническое задание на интернет-магазин.'),
            ('expert', 'Какой функционал нужен?'),
            ('client', 'Каталог, корзина, оплата, личный кабинет.'),
            ('expert', 'Базовый набор. Есть ли интеграция с 1С?'),
            ('client', 'Да, нужна выгрузка товаров.'),
            ('expert', 'Тогда добавлю модуль интеграции. Стоимость 4000 руб.'),
            ('client', 'Согласен.'),
        ],
    },
    {
        'title': 'Научная статья по биологии',
        'messages': [
            ('expert', 'Здравствуйте! Прочитал ваш черновик статьи.'),
            ('client', 'Жду замечаний.'),
            ('expert', 'Введение нужно переписать. Слишком общие формулировки.'),
            ('client', 'А по методологии есть замечания?'),
            ('expert', 'Да, выборка слишком маленькая. Нужно минимум 100 человек.'),
            ('client', 'Могу увеличить выборку.'),
            ('expert', 'Тогда статья будет готова через неделю.'),
        ],
    },
    {
        'title': 'Дизайн логотипа компании',
        'messages': [
            ('client', 'Нужен логотип для IT-компании.'),
            ('expert', 'Какие цвета предпочитаете?'),
            ('client', 'Синий и белый, минимализм.'),
            ('expert', 'Понял. Есть референсы?'),
            ('client', 'Прилагаю 3 варианта для вдохновения.'),
            ('expert', 'Хорошо, подготовлю 5 эскизов.'),
            ('client', 'Отлично!'),
        ],
    },
    {
        'title': 'Перевод дипломной на английский',
        'messages': [
            ('client', 'Нужен перевод дипломной работы на английский, 60 страниц.'),
            ('expert', 'Какая тема?'),
            ('client', 'Международные финансы.'),
            ('expert', 'Специфическая терминология, буду уточнять.'),
            ('client', 'Могу предоставить глоссарий.'),
            ('expert', 'Будет очень полезно. Стоимость 8000 руб.'),
            ('client', 'Договорились.'),
        ],
    },
    {
        'title': 'Менторство по карьере',
        'messages': [
            ('expert', 'Здравствуйте! Расскажите о вашем опыте.'),
            ('client', 'Работаю аналитиком 2 года, хочу перейти в Data Science.'),
            ('expert', 'Хороший план. Какой стек знаете?'),
            ('client', 'Python, SQL, немного ML.'),
            ('expert', 'Нужно добавить Deep Learning и MLOps.'),
            ('client', 'Готов учиться. С чего начать?'),
            ('expert', 'С курса по PyTorch, рекомендую.'),
        ],
    },
    {
        'title': 'Аудит сайта',
        'messages': [
            ('client', 'Нужен технический аудит нашего сайта.'),
            ('expert', 'Какой сайт? Скиньте ссылку.'),
            ('client', 'example-shop.ru'),
            ('expert', 'Посмотрел. Много проблем с SEO и скоростью загрузки.'),
            ('client', 'Можете исправить?'),
            ('expert', 'Да, подготовлю отчёт с рекомендациями и исправлениями.'),
        ],
    },
    {
        'title': 'Составление резюме',
        'messages': [
            ('client', 'Помогите составить резюме для позиции менеджера.'),
            ('expert', 'Расскажите о вашем опыте.'),
            ('client', '5 лет в продажах, из них 2 года руководителем.'),
            ('expert', 'Хороший опыт. Какие достижения есть?'),
            ('client', 'Увеличил продажи на 40% за год.'),
            ('expert', 'Отлично, это главный пункт в резюме.'),
        ],
    },
    {
        'title': 'Помощь с диссертацией',
        'messages': [
            ('expert', 'Здравствуйте! Обсудим вашу диссертацию.'),
            ('client', 'Да. Тема: "Искусственный интеллект в образовании".'),
            ('expert', 'Актуальная тема. Какой этап сейчас?'),
            ('client', 'Написана первая глава, нужна рецензия.'),
            ('expert', 'Прочту и дам подробную обратную связь.'),
            ('client', 'Спасибо! Когда ждать?'),
            ('expert', 'Через 3-4 дня.'),
        ],
    },
    {
        'title': 'Консультация по юриспруденции',
        'messages': [
            ('client', 'Здравствуйте! Нужна консультация по трудовому праву.'),
            ('expert', 'Какой вопрос?'),
            ('client', 'Работодатель не выплачивает зарплату 2 месяца.'),
            ('expert', 'Это нарушение статьи 136 ТК РФ.'),
            ('client', 'Что делать?'),
            ('expert', 'Можно подать жалобу в трудовую инспекцию или в суд.'),
        ],
    },
    {
        'title': 'Маркетинговая стратегия',
        'messages': [
            ('expert', 'Здравствуйте! Разработаю маркетинговую стратегию.'),
            ('client', 'Отлично. Наш продукт — онлайн-курсы.'),
            ('expert', 'Целевая аудитория?'),
            ('client', 'Студенты 18-25 лет.'),
            ('expert', 'Рекомендую активные соцсети и таргет.'),
            ('client', 'Бюджет ограничен, 50 тыс руб в месяц.'),
            ('expert', 'Хорошо, оптимизируем.'),
        ],
    },
    {
        'title': 'Обучение Excel',
        'messages': [
            ('client', 'Хотел бы научиться работать с Excel на продвинутом уровне.'),
            ('expert', 'Какой уровень сейчас?'),
            ('client', 'Базовый — формулы, простые таблицы.'),
            ('expert', 'Тогда начнём с сводных таблиц и макросов.'),
            ('client', 'Сколько уроков потребуется?'),
            ('expert', 'Примерно 10 занятий по 1.5 часа.'),
        ],
    },
    {
        'title': 'Написание сценария',
        'messages': [
            ('client', 'Нужен сценарий короткометражного фильма, 20 минут.'),
            ('expert', 'Какой жанр?'),
            ('client', 'Драма, история о дружбе.'),
            ('expert', 'Есть ли готовая идея или сюжет?'),
            ('client', 'Два друга детства встречаются после 10 лет.'),
            ('expert', 'Хорошая основа. Напишу treatment и полный сценарий.'),
            ('client', 'Сроки и стоимость?'),
            ('expert', '7 дней, 6000 руб.'),
        ],
    },
    {
        'title': 'Юридический аудит документов',
        'messages': [
            ('client', 'Нужна проверка документов для регистрации ООО.'),
            ('expert', 'Какие документы подготовлены?'),
            ('client', 'Устав, решение о создании, заявление Р11001.'),
            ('expert', 'Хорошо, проверю на ошибки.'),
            ('client', 'Есть ли риски?'),
            ('expert', 'Пока не вижу критических замечаний, но уточню пару моментов.'),
        ],
    },
]


class Command(BaseCommand):
    help = 'Создаёт 20 тестовых диалогов с разными аккаунтами'

    def add_arguments(self, parser):
        parser.add_argument('--clear', action='store_true', help='Удалить существующие тестовые диалоги')

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write('Очистка...')
            Message.objects.filter(chat__context_title__startswith='[TEST]').delete()
            Chat.objects.filter(context_title__startswith='[TEST]').delete()
            for data in EXTRA_CLIENTS + EXTRA_EXPERTS:
                User.objects.filter(email=data['email']).delete()
            self.stdout.write(self.style.SUCCESS('Очищено.\n'))

        self.stdout.write('Создание тестовых пользователей...\n')

        test_client = User.objects.get(email='client@test.com')
        test_expert = User.objects.get(email='expert@test.com')

        extra_clients = []
        for data in EXTRA_CLIENTS:
            user, _ = User.objects.get_or_create(
                email=data['email'],
                defaults={
                    'username': data['username'],
                    'first_name': data['first_name'],
                    'last_name': data['last_name'],
                    'role': 'client',
                },
            )
            extra_clients.append(user)
            self.stdout.write(f'  👤 {user.username} ({user.email})')

        extra_experts = []
        for data in EXTRA_EXPERTS:
            user, _ = User.objects.get_or_create(
                email=data['email'],
                defaults={
                    'username': data['username'],
                    'first_name': data['first_name'],
                    'last_name': data['last_name'],
                    'role': 'expert',
                },
            )
            extra_experts.append(user)
            self.stdout.write(f'  👨‍💼 {user.username} ({user.email})')

        self.stdout.write(f'\nСоздание {len(DIALOGUES)} диалогов...\n')

        now = timezone.now()

        for i, template in enumerate(DIALOGUES):
            if i < len(extra_clients):
                client_user = extra_clients[i]
                expert_user = test_expert
            elif i - len(extra_clients) < len(extra_experts):
                client_user = test_client
                expert_user = extra_experts[i - len(extra_clients)]
            else:
                client_user = test_client
                expert_user = test_expert

            chat, created = Chat.objects.get_or_create(
                client=client_user,
                expert=expert_user,
                context_title=f'[TEST] {template["title"]}',
            )
            if not created:
                self.stdout.write(f'  ⏭  "{template["title"]}" существует')
                continue

            chat.participants.add(client_user, expert_user)

            base_time = now - timedelta(days=random.randint(1, 30), hours=random.randint(0, 23))

            for j, (sender_role, text) in enumerate(template['messages']):
                sender = client_user if sender_role == 'client' else expert_user
                msg_time = base_time + timedelta(minutes=j * random.randint(2, 30))

                Message.objects.create(
                    chat=chat,
                    sender=sender,
                    text=text,
                    message_type='text',
                    is_read=random.random() > 0.3,
                    created_at=msg_time,
                )

            self.stdout.write(
                self.style.SUCCESS(
                    f'  ✅ [{chat.id}] "{template["title"]}" — {len(template["messages"])} сообщ. — {client_user.username} ↔ {expert_user.username}'
                )
            )

        total_chats = Chat.objects.filter(context_title__startswith='[TEST]').count()
        total_msgs = Message.objects.filter(chat__context_title__startswith='[TEST]').count()
        self.stdout.write(f'\n✅ Готово! Диалогов: {total_chats}, сообщений: {total_msgs}')
