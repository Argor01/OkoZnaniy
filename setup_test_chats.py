#!/usr/bin/env python
"""
Скрипт для создания тестовых пользователей с заказами и чатами
Использование: python setup_test_chats.py
"""
import os
import sys
import django
from datetime import timedelta

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from django.utils import timezone
from apps.users.models import User
from apps.orders.models import Order
from apps.chat.models import Chat, Message
from apps.catalog.models import Subject, WorkType, Complexity


def create_test_users():
    """Создание тестовых пользователей"""
    users_data = [
        {
            'username': 'client1',
            'email': 'client1@test.com',
            'password': 'test123',
            'role': 'client',
            'first_name': 'Иван',
            'last_name': 'Клиентов',
        },
        {
            'username': 'client2',
            'email': 'client2@test.com',
            'password': 'test123',
            'role': 'client',
            'first_name': 'Мария',
            'last_name': 'Заказчикова',
        },
        {
            'username': 'expert1',
            'email': 'expert1@test.com',
            'password': 'test123',
            'role': 'expert',
            'first_name': 'Петр',
            'last_name': 'Экспертов',
        },
        {
            'username': 'expert2',
            'email': 'expert2@test.com',
            'password': 'test123',
            'role': 'expert',
            'first_name': 'Анна',
            'last_name': 'Специалистова',
        },
    ]

    created_users = {}
    for user_data in users_data:
        user, created = User.objects.get_or_create(
            username=user_data['username'],
            defaults={
                'email': user_data['email'],
                'role': user_data['role'],
                'first_name': user_data['first_name'],
                'last_name': user_data['last_name'],
                'is_active': True,
                'email_verified': True,
            }
        )
        if created:
            user.set_password(user_data['password'])
            user.save()
            print(f"✓ Создан пользователь: {user.username} ({user.role})")
        else:
            print(f"• Пользователь уже существует: {user.username}")
        
        created_users[user_data['username']] = user

    return created_users


def create_catalog_data():
    """Создание базовых данных каталога"""
    # Предметы
    subject, _ = Subject.objects.get_or_create(
        name='Математика',
        defaults={'description': 'Математические дисциплины'}
    )
    
    # Типы работ
    work_type, _ = WorkType.objects.get_or_create(
        name='Контрольная работа',
        defaults={'description': 'Контрольная работа'}
    )
    
    # Сложность
    complexity, _ = Complexity.objects.get_or_create(
        name='Средняя',
        defaults={'multiplier': 1.0}
    )
    
    return subject, work_type, complexity


def create_test_orders_with_chats(users, subject, work_type, complexity):
    """Создание тестовых заказов с чатами"""
    
    orders_data = [
        {
            'client': users['client1'],
            'expert': users['expert1'],
            'title': 'Решить задачи по алгебре',
            'description': 'Нужно решить 10 задач по линейной алгебре',
            'budget': 1500,
            'status': 'in_progress',
            'messages': [
                {'sender': 'client1', 'text': 'Здравствуйте! Когда сможете приступить к работе?'},
                {'sender': 'expert1', 'text': 'Добрый день! Приступлю сегодня вечером.'},
                {'sender': 'client1', 'text': 'Отлично, жду результат!'},
            ]
        },
        {
            'client': users['client1'],
            'expert': users['expert2'],
            'title': 'Контрольная по математическому анализу',
            'description': 'Контрольная работа, 5 заданий',
            'budget': 2000,
            'status': 'in_progress',
            'messages': [
                {'sender': 'client1', 'text': 'Добрый день! Можете взяться за эту работу?'},
                {'sender': 'expert2', 'text': 'Здравствуйте! Да, конечно. Пришлите задания.'},
                {'sender': 'client1', 'text': 'Отправил файлы в прикрепленных документах'},
                {'sender': 'expert2', 'text': 'Получил, начинаю работу'},
            ]
        },
        {
            'client': users['client2'],
            'expert': users['expert1'],
            'title': 'Задачи по теории вероятностей',
            'description': 'Решение задач по теории вероятностей, 8 штук',
            'budget': 1800,
            'status': 'in_progress',
            'messages': [
                {'sender': 'client2', 'text': 'Здравствуйте! Срочно нужна помощь с задачами'},
                {'sender': 'expert1', 'text': 'Добрый день! Какой срок выполнения?'},
                {'sender': 'client2', 'text': 'До завтрашнего вечера'},
                {'sender': 'expert1', 'text': 'Хорошо, успею. Приступаю.'},
                {'sender': 'client2', 'text': 'Спасибо большое!'},
            ]
        },
    ]

    for i, order_data in enumerate(orders_data, 1):
        # Создаем заказ
        order, created = Order.objects.get_or_create(
            title=order_data['title'],
            defaults={
                'client': order_data['client'],
                'expert': order_data['expert'],
                'subject': subject,
                'work_type': work_type,
                'complexity': complexity,
                'description': order_data['description'],
                'budget': order_data['budget'],
                'status': order_data['status'],
                'deadline': timezone.now() + timedelta(days=3),
            }
        )
        
        if created:
            print(f"\n✓ Создан заказ #{order.id}: {order.title}")
            
            # Создаем чат для заказа
            chat, chat_created = Chat.objects.get_or_create(order=order)
            if chat_created:
                chat.participants.add(order_data['client'], order_data['expert'])
                print(f"  ✓ Создан чат для заказа #{order.id}")
                
                # Создаем сообщения
                for msg_data in order_data['messages']:
                    sender = users[msg_data['sender']]
                    message = Message.objects.create(
                        chat=chat,
                        sender=sender,
                        text=msg_data['text'],
                        is_read=False
                    )
                    print(f"    • Сообщение от {sender.username}: {msg_data['text'][:40]}...")
        else:
            print(f"• Заказ уже существует: {order.title}")


def main():
    print("=" * 60)
    print("НАСТРОЙКА ТЕСТОВЫХ АККАУНТОВ С ЧАТАМИ")
    print("=" * 60)
    
    print("\n1. Создание пользователей...")
    users = create_test_users()
    
    print("\n2. Создание данных каталога...")
    subject, work_type, complexity = create_catalog_data()
    print(f"✓ Предмет: {subject.name}")
    print(f"✓ Тип работы: {work_type.name}")
    print(f"✓ Сложность: {complexity.name}")
    
    print("\n3. Создание заказов с чатами...")
    create_test_orders_with_chats(users, subject, work_type, complexity)
    
    print("\n" + "=" * 60)
    print("ГОТОВО! Тестовые данные созданы")
    print("=" * 60)
    print("\nТестовые аккаунты для входа:")
    print("-" * 60)
    print("Клиенты:")
    print("  • client1@test.com / test123 (Иван Клиентов)")
    print("  • client2@test.com / test123 (Мария Заказчикова)")
    print("\nЭксперты:")
    print("  • expert1@test.com / test123 (Петр Экспертов)")
    print("  • expert2@test.com / test123 (Анна Специалистова)")
    print("-" * 60)
    print("\nУ каждого пользователя есть активные чаты с сообщениями!")
    print("=" * 60)


if __name__ == '__main__':
    main()
