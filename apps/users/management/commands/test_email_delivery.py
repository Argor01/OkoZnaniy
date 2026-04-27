"""
Команда для тестирования доставки email на разные домены
"""
from django.core.management.base import BaseCommand
from django.core.mail import send_mail
from django.conf import settings


class Command(BaseCommand):
    help = 'Тестирование доставки email на разные домены'

    def add_arguments(self, parser):
        parser.add_argument(
            '--email',
            type=str,
            help='Email для теста',
        )

    def handle(self, *args, **kwargs):
        test_emails = [
            kwargs.get('email') or 'YanBrait@yandex.ru',
        ]
        
        for email in test_emails:
            self.stdout.write(f'Отправка теста на {email}...')
            
            subject = 'Тест доставки OkoZnaniy'
            message = f'''
Тестовое письмо для проверки доставки.

Email: {email}
Время: 2026

Если вы получили это письмо, значит доставка работает корректно.

С уважением,
Команда OkoZnaniy
            '''
            
            try:
                send_mail(
                    subject=subject,
                    message=message,
                    from_email=settings.DEFAULT_FROM_EMAIL or settings.EMAIL_HOST_USER,
                    recipient_list=[email],
                    fail_silently=False,
                )
                self.stdout.write(self.style.SUCCESS(f'✓ Письмо успешно отправлено на {email}'))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'✗ Ошибка отправки на {email}: {str(e)}'))
