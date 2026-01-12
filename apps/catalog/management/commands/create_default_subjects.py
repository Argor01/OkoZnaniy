from django.core.management.base import BaseCommand
from django.utils.text import slugify
from apps.catalog.models import Subject, SubjectCategory

class Command(BaseCommand):
    help = 'Создает базовые предметы для каждой категории'

    def handle(self, *args, **options):
        # Сначала удаляем все существующие предметы
        Subject.objects.all().delete()
        
        subjects_data = {
            'technical-sciences': [
                {'name': 'Математика', 'slug': 'matematika', 'description': 'Высшая математика, алгебра, геометрия', 'min_price': 500, 'icon': 'fa-square-root-variable'},
                {'name': 'Информатика (ИКТ)', 'slug': 'informatika-ikt', 'description': 'Программирование, базы данных', 'min_price': 700, 'icon': 'fa-code'},
                {'name': 'Инженерная графика', 'slug': 'inzhenernaya-grafika-dlya-tehnicheskih-vuzov', 'description': 'Черчение, начертательная геометрия', 'min_price': 600, 'icon': 'fa-compass-drafting'},
                {'name': 'Физика', 'slug': 'fizika', 'description': 'Общая физика, механика, электричество', 'min_price': 600, 'icon': 'fa-atom'},
                {'name': 'Электротехника', 'slug': 'elektrotehnika', 'description': 'ТОЭ, электрические цепи', 'min_price': 600, 'icon': 'fa-plug'},
                {'name': 'Техническая механика', 'slug': 'tehnicheskaya-mehanika', 'description': 'Теормех, детали машин', 'min_price': 600, 'icon': 'fa-gears'},
                {'name': 'Механика материалов', 'slug': 'mehanika-materialov', 'description': 'Сопромат, механика деформируемого твердого тела', 'min_price': 600, 'icon': 'fa-shapes'},
                {'name': 'Материаловедение', 'slug': 'materialovedenie', 'description': 'Строение и свойства материалов', 'min_price': 600, 'icon': 'fa-cube'},
                {'name': 'Охрана труда', 'slug': 'ohrana-truda', 'description': 'Безопасность труда, производственная санитария', 'min_price': 500, 'icon': 'fa-helmet-safety'},
                {'name': 'Технология производства', 'slug': 'tehnologiya-proizvodstva', 'description': 'Технологические процессы, оборудование', 'min_price': 600, 'icon': 'fa-industry'},
                {'name': 'Сопротивление материалов', 'slug': 'soprotivlenie-materialov', 'description': 'Расчеты на прочность и жесткость', 'min_price': 700, 'icon': 'fa-bridge'},
                {'name': 'Теория систем и системный анализ', 'slug': 'teoriya-sistem-i-sistemnyy-analiz', 'description': 'Системный подход, моделирование', 'min_price': 800, 'icon': 'fa-network-wired'},
                {'name': 'Стандартизация и метрология', 'slug': 'standartizaciya-i-metrologiya', 'description': 'Метрология, стандартизация, сертификация', 'min_price': 600, 'icon': 'fa-ruler-combined'},
                {'name': 'Физика твёрдого тела', 'slug': 'fizika-tvyordogo-tela', 'description': 'Кристаллография, свойства твердых тел', 'min_price': 800, 'icon': 'fa-gem'},
                {'name': 'Физические основы техники', 'slug': 'fizicheskie-osnovy-tehniki', 'description': 'Физические принципы работы устройств', 'min_price': 700, 'icon': 'fa-microchip'},
                {'name': 'Конструкторская документация', 'slug': 'konstruktorskaya-dokumentaciya', 'description': 'ЕСКД, оформление чертежей', 'min_price': 500, 'icon': 'fa-file-signature'},
                {'name': 'Современные технологические процессы', 'slug': 'sovremennye-tehnologicheskie-processy', 'description': 'Новые технологии в производстве', 'min_price': 700, 'icon': 'fa-robot'},
                {'name': 'Инновационные технологии', 'slug': 'innovacionnye-tehnologii', 'description': 'Внедрение инноваций', 'min_price': 700, 'icon': 'fa-lightbulb'},
                {'name': 'Безопасность информационных систем', 'slug': 'bezopasnost-informacionnyh-sistem', 'description': 'Защита информации, кибербезопасность', 'min_price': 800, 'icon': 'fa-shield-halved'},
                {'name': 'Системы искусственного интеллекта', 'slug': 'sistemy-iskusstvennogo-intellekta', 'description': 'Нейросети, машинное обучение', 'min_price': 1000, 'icon': 'fa-brain'},
                {'name': 'ИТ-безопасность', 'slug': 'it-bezopasnost-ili-osnovy-kiberzashchity', 'description': 'Основы киберзащиты', 'min_price': 800, 'icon': 'fa-lock'},
                {'name': 'Основы проектирования', 'slug': 'osnovy-proektirovaniya-tehnicheskoe-cherchenie', 'description': 'Техническое черчение', 'min_price': 600, 'icon': 'fa-pencil-ruler'},
                {'name': 'Метрология', 'slug': 'metrologiya', 'description': 'Наука об измерениях', 'min_price': 600, 'icon': 'fa-scale-unbalanced'},
                {'name': 'Химия материалов', 'slug': 'himiya-materialov', 'description': 'Химические свойства материалов', 'min_price': 600, 'icon': 'fa-flask'},
                {'name': 'Геоинформационные системы', 'slug': 'geoinformacionnye-sistemy', 'description': 'ГИС технологии', 'min_price': 800, 'icon': 'fa-map-location-dot'},
                {'name': 'Цифровая грамотность', 'slug': 'cifrovaya-gramotnost', 'description': 'Базовые навыки работы с ПК', 'min_price': 400, 'icon': 'fa-laptop'},
                {'name': 'Аналитическая геометрия', 'slug': 'analiticheskaya-geometriya', 'description': 'Векторы, координаты, линии и поверхности', 'min_price': 600, 'icon': 'fa-shapes'},
                {'name': 'Математическая логика', 'slug': 'matematicheskaya-logika', 'description': 'Булева алгебра, исчисление высказываний', 'min_price': 700, 'icon': 'fa-calculator'},
            ],
            'humanities': [
                {'name': 'Русский язык', 'slug': 'russkiy-yazyk', 'description': 'Грамматика, пунктуация, стилистика', 'min_price': 400, 'icon': 'fa-pen-nib'},
                {'name': 'Литература', 'slug': 'literatura', 'description': 'Отечественная и мировая литература', 'min_price': 450, 'icon': 'fa-book-open'},
                {'name': 'История', 'slug': 'istoriya', 'description': 'История России, всеобщая история', 'min_price': 450, 'icon': 'fa-landmark'},
                {'name': 'Философия', 'slug': 'filosofiya', 'description': 'История философии, онтология, гносеология', 'min_price': 500, 'icon': 'fa-book-skull'},
                {'name': 'Иностранный язык', 'slug': 'inostrannyy-yazyk', 'description': 'Английский, немецкий, французский', 'min_price': 500, 'icon': 'fa-language'},
                {'name': 'Культурология', 'slug': 'kulturologiya', 'description': 'Теория и история культуры', 'min_price': 450, 'icon': 'fa-masks-theater'},
                {'name': 'Этика и эстетика', 'slug': 'etika-i-estetika', 'description': 'Нравственность, прекрасное в искусстве', 'min_price': 450, 'icon': 'fa-heart'},
                {'name': 'Ораторское искусство', 'slug': 'oratorskoe-iskusstvo-ritorika', 'description': 'Риторика, публичные выступления', 'min_price': 500, 'icon': 'fa-microphone-lines'},
                {'name': 'Антропология', 'slug': 'antropologiya', 'description': 'Происхождение и эволюция человека', 'min_price': 500, 'icon': 'fa-user-group'},
                {'name': 'Иностранная литература', 'slug': 'inostrannaya-literatura', 'description': 'Литература зарубежных стран', 'min_price': 500, 'icon': 'fa-book-atlas'},
                {'name': 'Педагогика', 'slug': 'pedagogika', 'description': 'Теория и методика обучения', 'min_price': 500, 'icon': 'fa-chalkboard-user'},
                {'name': 'Логика', 'slug': 'logika', 'description': 'Формальная логика', 'min_price': 500, 'icon': 'fa-puzzle-piece'},
                {'name': 'Религиоведение', 'slug': 'religiovedenie', 'description': 'История религий', 'min_price': 500, 'icon': 'fa-star-and-crescent'},
                {'name': 'Эстетика', 'slug': 'estetika', 'description': 'Философия искусства', 'min_price': 500, 'icon': 'fa-eye'},
                {'name': 'Филология', 'slug': 'filologiya', 'description': 'Языкознание, литературоведение', 'min_price': 500, 'icon': 'fa-spell-check'},
                {'name': 'Поликультурное образование', 'slug': 'polikulturnoe-obrazovanie', 'description': 'Образование в многокультурной среде', 'min_price': 500, 'icon': 'fa-earth-asia'},
                {'name': 'Гуманитарные технологии', 'slug': 'gumanitarnye-tehnologii', 'description': 'Технологии влияния на человека', 'min_price': 600, 'icon': 'fa-hand-holding-heart'},
                {'name': 'Теория и практика коммуникации', 'slug': 'teoriya-i-praktika-kommunikacii', 'description': 'Межличностная и массовая коммуникация', 'min_price': 500, 'icon': 'fa-comments'},
                {'name': 'Имиджология', 'slug': 'imidzhologiya', 'description': 'Создание имиджа', 'min_price': 600, 'icon': 'fa-user-tie'},
            ],
            'natural-sciences': [
                {'name': 'Экология', 'slug': 'ekologiya', 'description': 'Охрана окружающей среды', 'min_price': 500, 'icon': 'fa-leaf'},
                {'name': 'География', 'slug': 'geografiya', 'description': 'Физическая и экономическая география', 'min_price': 450, 'icon': 'fa-globe'},
                {'name': 'Химия', 'slug': 'himiya', 'description': 'Неорганическая, органическая химия', 'min_price': 600, 'icon': 'fa-flask'},
                {'name': 'Биология', 'slug': 'biologiya', 'description': 'Ботаника, зоология, анатомия', 'min_price': 550, 'icon': 'fa-dna'},
                {'name': 'Геология', 'slug': 'geologiya', 'description': 'Строение Земли, полезные ископаемые', 'min_price': 550, 'icon': 'fa-mountain'},
                {'name': 'Почвоведение', 'slug': 'pochvovedenie', 'description': 'Изучение почв', 'min_price': 550, 'icon': 'fa-mound'},
                {'name': 'Биохимия', 'slug': 'biohimiya', 'description': 'Химические процессы в живых организмах', 'min_price': 650, 'icon': 'fa-vial'},
                {'name': 'Физическая география', 'slug': 'fizicheskaya-geografiya', 'description': 'Природные комплексы', 'min_price': 500, 'icon': 'fa-mountain-sun'},
                {'name': 'Картография', 'slug': 'kartografiya', 'description': 'Создание и использование карт', 'min_price': 550, 'icon': 'fa-map'},
            ],
            'social-sciences': [
                {'name': 'Экономика', 'slug': 'ekonomika', 'description': 'Микро- и макроэкономика', 'min_price': 600, 'icon': 'fa-chart-line'},
                {'name': 'Право / Правоведение', 'slug': 'pravo-pravovedenie', 'description': 'Основы права', 'min_price': 600, 'icon': 'fa-scale-balanced'},
                {'name': 'Социология', 'slug': 'sociologiya', 'description': 'Общество и социальные отношения', 'min_price': 550, 'icon': 'fa-users'},
                {'name': 'Политология', 'slug': 'politologiya', 'description': 'Политические системы и процессы', 'min_price': 550, 'icon': 'fa-landmark-dome'},
                {'name': 'Психология', 'slug': 'psihologiya', 'description': 'Общая и социальная психология', 'min_price': 600, 'icon': 'fa-brain'},
                {'name': 'Менеджмент', 'slug': 'menedzhment', 'description': 'Управление организацией', 'min_price': 600, 'icon': 'fa-briefcase'},
                {'name': 'Статистика', 'slug': 'statistika', 'description': 'Сбор и анализ данных', 'min_price': 600, 'icon': 'fa-chart-simple'},
                {'name': 'Инвестиции и финансы', 'slug': 'investicii-i-finansy', 'description': 'Финансовые рынки, инвестирование', 'min_price': 700, 'icon': 'fa-sack-dollar'},
                {'name': 'Правила дорожного движения', 'slug': 'pravila-dorozhnogo-dvizheniya', 'description': 'ПДД', 'min_price': 300, 'icon': 'fa-car'},
                {'name': 'Трудовое право', 'slug': 'trudovoe-pravo', 'description': 'Трудовые отношения', 'min_price': 600, 'icon': 'fa-helmet-safety'},
                {'name': 'Маркетинг', 'slug': 'marketing', 'description': 'Продвижение товаров и услуг', 'min_price': 600, 'icon': 'fa-bullhorn'},
                {'name': 'Социальная работа', 'slug': 'socialnaya-rabota', 'description': 'Помощь социально незащищенным слоям', 'min_price': 500, 'icon': 'fa-hand-holding-hand'},
                {'name': 'Основы предпринимательства', 'slug': 'osnovy-predprinimatelskoy-deyatelnosti', 'description': 'Бизнес-планирование, стартапы', 'min_price': 600, 'icon': 'fa-rocket'},
                {'name': 'Экономика организации', 'slug': 'ekonomika-organizacii', 'description': 'Экономика предприятия', 'min_price': 650, 'icon': 'fa-building'},
                {'name': 'Основы деловой коммуникации', 'slug': 'osnovy-delovoy-kommunikacii', 'description': 'Деловое общение', 'min_price': 500, 'icon': 'fa-handshake'},
                {'name': 'Этика делового общения', 'slug': 'etika-delovogo-obshcheniya', 'description': 'Корпоративная этика', 'min_price': 500, 'icon': 'fa-user-tie'},
                {'name': 'Проектная деятельность', 'slug': 'proektnaya-deyatelnost', 'description': 'Управление проектами', 'min_price': 600, 'icon': 'fa-list-check'},
                {'name': 'История государства и права', 'slug': 'istoriya-gosudarstva-i-prava', 'description': 'ИГП России и зарубежных стран', 'min_price': 600, 'icon': 'fa-book-bookmark'},
                {'name': 'Методология научных исследований', 'slug': 'metodologiya-i-metodika-nauchnyh-issledovaniy', 'description': 'Как писать научные работы', 'min_price': 600, 'icon': 'fa-magnifying-glass'},
                {'name': 'Психология проф. деятельности', 'slug': 'psihologiya-professionalnoy-deyatelnosti', 'description': 'Психология труда', 'min_price': 600, 'icon': 'fa-briefcase-medical'},
                {'name': 'Экономическая теория', 'slug': 'ekonomicheskaya-teoriya', 'description': 'Макро- и микроэкономика', 'min_price': 600, 'icon': 'fa-money-bill-trend-up'},
                {'name': 'Организация производства', 'slug': 'organizaciya-proizvodstva', 'description': 'Производственный менеджмент', 'min_price': 650, 'icon': 'fa-industry'},
                {'name': 'Введение в специальность', 'slug': 'vvedenie-v-specialnost', 'description': 'Основы профессии', 'min_price': 400, 'icon': 'fa-door-open'},
                {'name': 'Управление проектами', 'slug': 'upravlenie-proektami', 'description': 'Project Management', 'min_price': 700, 'icon': 'fa-diagram-project'},
                {'name': 'Идеология и практика инноваций', 'slug': 'ideologiya-i-praktika-innovaciy', 'description': 'Инновационный менеджмент', 'min_price': 600, 'icon': 'fa-lightbulb'},
                {'name': 'Деловая этика', 'slug': 'delovaya-etika', 'description': 'Этика бизнеса', 'min_price': 500, 'icon': 'fa-handshake-angle'},
                {'name': 'Трудовые ресурсы', 'slug': 'trudovye-resursy', 'description': 'Рынок труда', 'min_price': 600, 'icon': 'fa-people-group'},
                {'name': 'Основы профориентации', 'slug': 'osnovy-proforientacii-i-adaptacii', 'description': 'Выбор профессии', 'min_price': 500, 'icon': 'fa-compass'},
                {'name': 'Управленческий учет', 'slug': 'upravlencheskiy-uchet', 'description': 'Учет для менеджеров', 'min_price': 700, 'icon': 'fa-file-invoice-dollar'},
                {'name': 'Антикоррупционная политика', 'slug': 'antikorrupcionnaya-politika', 'description': 'Противодействие коррупции', 'min_price': 500, 'icon': 'fa-gavel'},
                {'name': 'Теория государства и права', 'slug': 'teoriya-gosudarstva-i-prava', 'description': 'ТГП', 'min_price': 600, 'icon': 'fa-scale-unbalanced-flip'},
                {'name': 'Корпоративная культура', 'slug': 'korporativnaya-kultura', 'description': 'Культура организации', 'min_price': 500, 'icon': 'fa-building-user'},
                {'name': 'Управление персоналом', 'slug': 'upravlenie-personalom', 'description': 'HR-менеджмент', 'min_price': 650, 'icon': 'fa-users-gear'},
                {'name': 'Делопроизводство', 'slug': 'deloproizvodstvo-i-dokumentacionnoe-obespechenie', 'description': 'Документооборот', 'min_price': 500, 'icon': 'fa-file-signature'},
                {'name': 'Этнопсихология', 'slug': 'etnopsihologiya', 'description': 'Психология народов', 'min_price': 550, 'icon': 'fa-earth-africa'},
                {'name': 'Финансы и кредит', 'slug': 'finansy-i-kredit', 'description': 'Банковское дело, финансы', 'min_price': 650, 'icon': 'fa-credit-card'},
                {'name': 'Бухгалтерский учет', 'slug': 'buhgalterskiy-uchet', 'description': 'Бухучет и аудит', 'min_price': 700, 'icon': 'fa-calculator'},
                {'name': 'Страхование', 'slug': 'strahovanie', 'description': 'Страховое дело', 'min_price': 600, 'icon': 'fa-shield-heart'},
                {'name': 'Антикризисное управление', 'slug': 'antikrizisnoe-upravlenie', 'description': 'Управление в кризис', 'min_price': 700, 'icon': 'fa-fire-extinguisher'},
                {'name': 'Лидершип и тимбилдинг', 'slug': 'lidershipi-timbilding', 'description': 'Лидерство и командообразование', 'min_price': 600, 'icon': 'fa-people-pulling'},
                {'name': 'Международные отношения', 'slug': 'mezhdunarodnye-otnosheniya', 'description': 'Дипломатия, мировая политика', 'min_price': 650, 'icon': 'fa-handshake-simple'},
                {'name': 'Экологическое право', 'slug': 'ekologicheskoe-pravo', 'description': 'Правовая охрана природы', 'min_price': 600, 'icon': 'fa-leaf'},
                {'name': 'Управление инновациями', 'slug': 'upravlenie-innovaciyami', 'description': 'Менеджмент инноваций', 'min_price': 700, 'icon': 'fa-lightbulb'},
                {'name': 'Социальная психология', 'slug': 'socialnaya-psihologiya', 'description': 'Психология общения', 'min_price': 600, 'icon': 'fa-users'},
                {'name': 'Основы менеджмента', 'slug': 'osnovy-menedzhmenta', 'description': 'Введение в менеджмент', 'min_price': 500, 'icon': 'fa-briefcase'},
                {'name': 'Основы социальных наук', 'slug': 'osnovy-socialnyh-nauk', 'description': 'Обществознание', 'min_price': 500, 'icon': 'fa-user-group'},
                {'name': 'Инженерная экономика', 'slug': 'inzhenernaya-ekonomika', 'description': 'Экономика в технике', 'min_price': 650, 'icon': 'fa-coins'},
                {'name': 'Демография', 'slug': 'demografiya', 'description': 'Наука о населении', 'min_price': 550, 'icon': 'fa-person-breastfeeding'},
                {'name': 'Базовые курсы по soft skills', 'slug': 'bazovye-kursy-po-soft-skills', 'description': 'Гибкие навыки', 'min_price': 500, 'icon': 'fa-user-graduate'},
                {'name': 'Другое', 'slug': 'drugoe', 'description': 'Другие дисциплины', 'min_price': 500, 'icon': 'fa-question'},
            ],
            'medicine-and-healthcare': [
                {'name': 'Безопасность жизнедеятельности (БЖД)', 'slug': 'bezopasnost-zhiznedeyatelnosti-bzhd', 'description': 'Охрана здоровья и безопасность', 'min_price': 500, 'icon': 'fa-kit-medical'},
                {'name': 'Физическая культура', 'slug': 'fizicheskaya-kultura', 'description': 'Спорт, ЛФК', 'min_price': 400, 'icon': 'fa-heart-pulse'},
                {'name': 'ОБЖ / БЖД', 'slug': 'osnovy-bezopasnosti-zhiznedeyatelnosti-obzh-bzhd', 'description': 'Основы безопасности', 'min_price': 450, 'icon': 'fa-person-shelter'},
                {'name': 'Гражданская оборона', 'slug': 'grazhdanskaya-oborona', 'description': 'Защита населения в ЧС', 'min_price': 500, 'icon': 'fa-person-military-rifle'},
                {'name': 'Медицинская этика', 'slug': 'medicinskaya-etika', 'description': 'Биоэтика, деонтология', 'min_price': 500, 'icon': 'fa-user-nurse'},
                {'name': 'Организация здравоохранения', 'slug': 'organizaciya-zdravoohraneniya', 'description': 'Общественное здоровье', 'min_price': 600, 'icon': 'fa-hospital'},
            ],
            'art-and-design': [
                {'name': 'Градостроительство', 'slug': 'gradostroitelstvo', 'description': 'Планировка населенных мест', 'min_price': 700, 'icon': 'fa-city'},
                {'name': 'Архитектура', 'slug': 'arhitektura', 'description': 'Проектирование зданий', 'min_price': 800, 'icon': 'fa-archway'},
                {'name': 'Стандартизация и контроль качества', 'slug': 'standartizaciya-i-kontrol-kachestva', 'description': 'Контроль качества', 'min_price': 600, 'icon': 'fa-check-double'},
                {'name': 'Креативные индустрии', 'slug': 'kreativnye-industrii', 'description': 'Творческий бизнес', 'min_price': 600, 'icon': 'fa-palette'},
                {'name': 'Изобразительное искусство', 'slug': 'fine-arts', 'description': 'Живопись, графика', 'min_price': 500, 'icon': 'fa-paint-brush'},
                {'name': 'Музыка', 'slug': 'music', 'description': 'Музыкальное искусство', 'min_price': 500, 'icon': 'fa-music'},
            ]
        }

        created_count = 0
        for category_slug, subjects in subjects_data.items():
            try:
                category = SubjectCategory.objects.get(slug=category_slug)
                for subject_data in subjects:
                    # Создаем предмет с уникальным slug'ом
                    subject = Subject.objects.create(
                        name=subject_data['name'],
                        slug=subject_data['slug'],
                        description=subject_data['description'],
                        category=category,
                        min_price=subject_data['min_price'],
                        icon=subject_data['icon'],
                        is_active=True
                    )
                    created_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'Создан предмет "{subject.name}" (slug: {subject.slug}) в категории "{category.name}"'
                        )
                    )
            except SubjectCategory.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f'Категория со slug="{category_slug}" не найдена')
                )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Ошибка при создании предметов для категории "{category_slug}": {str(e)}')
                )

        self.stdout.write(
            self.style.SUCCESS(f'Создано {created_count} новых предметов')
        )
