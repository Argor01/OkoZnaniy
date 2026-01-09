#!/usr/bin/env python
"""
Скрипт для заполнения справочников предметов и типов работ
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.catalog.models import Subject, WorkType

def populate_subjects():
    """Создаёт базовые предметы"""
    subjects_data = [
        {'name': 'Русский язык', 'slug': 'russkiy-yazyk'},
        {'name': 'Литература', 'slug': 'literatura'},
        {'name': 'Математика', 'slug': 'matematika'},
        {'name': 'История', 'slug': 'istoriya'},
        {'name': 'Философия', 'slug': 'filosofiya'},
        {'name': 'Иностранный язык', 'slug': 'inostrannyy-yazyk'},
        {'name': 'Информатика (ИКТ)', 'slug': 'informatika-ikt'},
        {'name': 'Экономика', 'slug': 'ekonomika'},
        {'name': 'Право / Правоведение', 'slug': 'pravo-pravovedenie'},
        {'name': 'Безопасность жизнедеятельности (БЖД)', 'slug': 'bezopasnost-zhiznedeyatelnosti-bzhd'},
        {'name': 'Физическая культура', 'slug': 'fizicheskaya-kultura'},
        {'name': 'Социология', 'slug': 'sociologiya'},
        {'name': 'Политология', 'slug': 'politologiya'},
        {'name': 'Культурология', 'slug': 'kulturologiya'},
        {'name': 'Психология', 'slug': 'psihologiya'},
        {'name': 'Экология', 'slug': 'ekologiya'},
        {'name': 'Обязательное делопроизводство', 'slug': 'obyazatelnoe-deloproizvodstvo'},
        {'name': 'Этика и эстетика', 'slug': 'etika-i-estetika'},
        {'name': 'Менеджмент', 'slug': 'menedzhment'},
        {'name': 'Статистика', 'slug': 'statistika'},
        {'name': 'География', 'slug': 'geografiya'},
        {'name': 'Основы безопасности жизнедеятельности (ОБЖ / БЖД)', 'slug': 'osnovy-bezopasnosti-zhiznedeyatelnosti-obzh-bzhd'},
        {'name': 'Инженерная графика (для технических вузов)', 'slug': 'inzhenernaya-grafika-dlya-tehnicheskih-vuzov'},
        {'name': 'Физика', 'slug': 'fizika'},
        {'name': 'Химия', 'slug': 'himiya'},
        {'name': 'Биология', 'slug': 'biologiya'},
        {'name': 'Гражданская оборона', 'slug': 'grazhdanskaya-oborona'},
        {'name': 'Инвестиции и финансы', 'slug': 'investicii-i-finansy'},
        {'name': 'Ораторское искусство / Риторика', 'slug': 'oratorskoe-iskusstvo-ritorika'},
        {'name': 'Основы проектирования / Техническое черчение', 'slug': 'osnovy-proektirovaniya-tehnicheskoe-cherchenie'},
        {'name': 'Правила дорожного движения', 'slug': 'pravila-dorozhnogo-dvizheniya'},
        {'name': 'Трудовое право', 'slug': 'trudovoe-pravo'},
        {'name': 'Маркетинг', 'slug': 'marketing'},
        {'name': 'Стандартизация и сертификация', 'slug': 'standartizaciya-i-sertifikaciya'},
        {'name': 'Антропология', 'slug': 'antropologiya'},
        {'name': 'Градостроительство', 'slug': 'gradostroitelstvo'},
        {'name': 'Социальная работа', 'slug': 'socialnaya-rabota'},
        {'name': 'Основы предпринимательской деятельности', 'slug': 'osnovy-predprinimatelskoy-deyatelnosti'},
        {'name': 'Экономика организации', 'slug': 'ekonomika-organizacii'},
        {'name': 'Основы деловой коммуникации', 'slug': 'osnovy-delovoy-kommunikacii'},
        {'name': 'Иностранная литература', 'slug': 'inostrannaya-literatura'},
        {'name': 'Этика делового общения', 'slug': 'etika-delovogo-obshcheniya'},
        {'name': 'Проектная деятельность', 'slug': 'proektnaya-deyatelnost'},
        {'name': 'ИТ-безопасность или основы киберзащиты', 'slug': 'it-bezopasnost-ili-osnovy-kiberzashchity'},
        {'name': 'История государства и права', 'slug': 'istoriya-gosudarstva-i-prava'},
        {'name': 'Педагогика', 'slug': 'pedagogika'},
        {'name': 'Методология и методика научных исследований', 'slug': 'metodologiya-i-metodika-nauchnyh-issledovaniy'},
        {'name': 'Психология профессиональной деятельности', 'slug': 'psihologiya-professionalnoy-deyatelnosti'},
        {'name': 'Логика', 'slug': 'logika'},
        {'name': 'Архитектура', 'slug': 'arhitektura'},
        {'name': 'Геология', 'slug': 'geologiya'},
        {'name': 'Религиоведение', 'slug': 'religiovedenie'},
        {'name': 'Эстетика', 'slug': 'estetika'},
        {'name': 'Филология', 'slug': 'filologiya'},
        {'name': 'Почвоведение', 'slug': 'pochvovedenie'},
        {'name': 'Экономическая теория', 'slug': 'ekonomicheskaya-teoriya'},
        {'name': 'Аналитическая геометрия', 'slug': 'analiticheskaya-geometriya'},
        {'name': 'Организация производства', 'slug': 'organizaciya-proizvodstva'},
        {'name': 'Метрология', 'slug': 'metrologiya'},
        {'name': 'Электротехника', 'slug': 'elektrotehnika'},
        {'name': 'Техническая механика', 'slug': 'tehnicheskaya-mehanika'},
        {'name': 'Механика материалов', 'slug': 'mehanika-materialov'},
        {'name': 'Материаловедение', 'slug': 'materialovedenie'},
        {'name': 'Химия материалов', 'slug': 'himiya-materialov'},
        {'name': 'Охрана труда', 'slug': 'ohrana-truda'},
        {'name': 'Технология производства', 'slug': 'tehnologiya-proizvodstva'},
        {'name': 'Сопротивление материалов', 'slug': 'soprotivlenie-materialov'},
        {'name': 'Введение в специальность', 'slug': 'vvedenie-v-specialnost'},
        {'name': 'Теория систем и системный анализ', 'slug': 'teoriya-sistem-i-sistemnyy-analiz'},
        {'name': 'Управление проектами', 'slug': 'upravlenie-proektami'},
        {'name': 'Стандартизация и метрология', 'slug': 'standartizaciya-i-metrologiya'},
        {'name': 'Идеология и практика инноваций', 'slug': 'ideologiya-i-praktika-innovaciy'},
        {'name': 'Деловая этика', 'slug': 'delovaya-etika'},
        {'name': 'Трудовые ресурсы', 'slug': 'trudovye-resursy'},
        {'name': 'Физика твёрдого тела', 'slug': 'fizika-tvyordogo-tela'},
        {'name': 'Биохимия', 'slug': 'biohimiya'},
        {'name': 'Медицинская этика', 'slug': 'medicinskaya-etika'},
        {'name': 'Основы профориентации и адаптации', 'slug': 'osnovy-proforientacii-i-adaptacii'},
        {'name': 'Управленческий учет', 'slug': 'upravlencheskiy-uchet'},
        {'name': 'Антикоррупционная политика', 'slug': 'antikorrupcionnaya-politika'},
        {'name': 'Физическая география', 'slug': 'fizicheskaya-geografiya'},
        {'name': 'Математическая логика', 'slug': 'matematicheskaya-logika'},
        {'name': 'Физические основы техники', 'slug': 'fizicheskie-osnovy-tehniki'},
        {'name': 'Конструкторская документация', 'slug': 'konstruktorskaya-dokumentaciya'},
        {'name': 'Теория государства и права', 'slug': 'teoriya-gosudarstva-i-prava'},
        {'name': 'Корпоративная культура', 'slug': 'korporativnaya-kultura'},
        {'name': 'Современные технологические процессы', 'slug': 'sovremennye-tehnologicheskie-processy'},
        {'name': 'Инновационные технологии', 'slug': 'innovacionnye-tehnologii'},
        {'name': 'Управление персоналом', 'slug': 'upravlenie-personalom'},
        {'name': 'Делопроизводство и документационное обеспечение', 'slug': 'deloproizvodstvo-i-dokumentacionnoe-obespechenie'},
        {'name': 'Этнопсихология', 'slug': 'etnopsihologiya'},
        {'name': 'Поликультурное образование', 'slug': 'polikulturnoe-obrazovanie'},
        {'name': 'Финансы и кредит', 'slug': 'finansy-i-kredit'},
        {'name': 'Основы предпринимательства', 'slug': 'osnovy-predprinimatelstva'},
        {'name': 'Безопасность информационных систем', 'slug': 'bezopasnost-informacionnyh-sistem'},
        {'name': 'Бухгалтерский учет', 'slug': 'buhgalterskiy-uchet'},
        {'name': 'Страхование', 'slug': 'strahovanie'},
        {'name': 'Антикризисное управление', 'slug': 'antikrizisnoe-upravlenie'},
        {'name': 'Лидершип и тимбилдинг', 'slug': 'lidershipi-timbilding'},
        {'name': 'Организация здравоохранения', 'slug': 'organizaciya-zdravoohraneniya'},
        {'name': 'Международные отношения', 'slug': 'mezhdunarodnye-otnosheniya'},
        {'name': 'Экологическое право', 'slug': 'ekologicheskoe-pravo'},
        {'name': 'Стандартизация и контроль качества', 'slug': 'standartizaciya-i-kontrol-kachestva'},
        {'name': 'Управление инновациями', 'slug': 'upravlenie-innovaciyami'},
        {'name': 'Гуманитарные технологии', 'slug': 'gumanitarnye-tehnologii'},
        {'name': 'Креативные индустрии', 'slug': 'kreativnye-industrii'},
        {'name': 'Социальная психология', 'slug': 'socialnaya-psihologiya'},
        {'name': 'Теория и практика коммуникации', 'slug': 'teoriya-i-praktika-kommunikacii'},
        {'name': 'Основы менеджмента', 'slug': 'osnovy-menedzhmenta'},
        {'name': 'Производственная практика', 'slug': 'proizvodstvennaya-praktika'},
        {'name': 'Имиджология', 'slug': 'imidzhologiya'},
        {'name': 'Основы социальных наук', 'slug': 'osnovy-socialnyh-nauk'},
        {'name': 'Инженерная экономика', 'slug': 'inzhenernaya-ekonomika'},
        {'name': 'Картография', 'slug': 'kartografiya'},
        {'name': 'Демография', 'slug': 'demografiya'},
        {'name': 'Геоинформационные системы', 'slug': 'geoinformacionnye-sistemy'},
        {'name': 'Управление проектами и программами', 'slug': 'upravlenie-proektami-i-programmami'},
        {'name': 'Цифровая грамотность', 'slug': 'cifrovaya-gramotnost'},
        {'name': 'Системы искусственного интеллекта', 'slug': 'sistemy-iskusstvennogo-intellekta'},
        {'name': 'Базовые курсы по soft skills', 'slug': 'bazovye-kursy-po-soft-skills'},
        {'name': 'Другое', 'slug': 'drugoe'},
    ]
    
    created_count = 0
    for data in subjects_data:
        subject, created = Subject.objects.get_or_create(
            slug=data['slug'],
            defaults={'name': data['name']}
        )
        if created:
            created_count += 1
            print(f"✅ Создан предмет: {subject.name} (ID: {subject.id})")
        else:
            print(f"ℹ️  Предмет уже существует: {subject.name} (ID: {subject.id})")
    
    return created_count

def populate_work_types():
    """Создаёт базовые типы работ"""
    work_types_data = [
        {'name': 'Курсовая работа', 'slug': 'kursovaya-rabota', 'base_price': 3000, 'estimated_time': 14},
        {'name': 'Другое', 'slug': 'drugoe', 'base_price': 1000, 'estimated_time': 7},
        {'name': 'Дипломная работа', 'slug': 'diplomnaya-rabota', 'base_price': 15000, 'estimated_time': 30},
        {'name': 'Реферат', 'slug': 'referat', 'base_price': 500, 'estimated_time': 3},
        {'name': 'Эссе', 'slug': 'esse', 'base_price': 800, 'estimated_time': 3},
        {'name': 'Контрольная работа', 'slug': 'kontrolnaya-rabota', 'base_price': 1000, 'estimated_time': 5},
        {'name': 'Лабораторная работа', 'slug': 'laboratornaya-rabota', 'base_price': 1500, 'estimated_time': 7},
        {'name': 'Решение задач', 'slug': 'reshenie-zadach', 'base_price': 500, 'estimated_time': 2},
        {'name': 'Презентация', 'slug': 'prezentaciya', 'base_price': 1000, 'estimated_time': 3},
        {'name': 'Отчёт по практике', 'slug': 'otchet-po-praktike', 'base_price': 2000, 'estimated_time': 7},
    ]
    
    created_count = 0
    for data in work_types_data:
        work_type, created = WorkType.objects.get_or_create(
            slug=data['slug'],
            defaults={
                'name': data['name'],
                'base_price': data['base_price'],
                'estimated_time': data['estimated_time']
            }
        )
        if created:
            created_count += 1
            print(f"✅ Создан тип работы: {work_type.name} (ID: {work_type.id}, цена: {work_type.base_price}₽)")
        else:
            print(f"ℹ️  Тип работы уже существует: {work_type.name} (ID: {work_type.id})")
    
    return created_count

def main():
    print("=" * 60)
    print("📚 Заполнение справочников предметов и типов работ")
    print("=" * 60)
    print()
    
    print("📖 Создание предметов...")
    subjects_created = populate_subjects()
    print(f"\n✅ Создано предметов: {subjects_created}")
    print(f"📊 Всего предметов в БД: {Subject.objects.count()}")
    print()
    
    print("📝 Создание типов работ...")
    work_types_created = populate_work_types()
    print(f"\n✅ Создано типов работ: {work_types_created}")
    print(f"📊 Всего типов работ в БД: {WorkType.objects.count()}")
    print()
    
    print("=" * 60)
    print("✅ Справочники успешно заполнены!")
    print("=" * 60)
    print()
    print("Теперь можно создавать заказы через интерфейс")

if __name__ == '__main__':
    main()
