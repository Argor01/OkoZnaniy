from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from apps.orders.models import Order
from apps.experts.models import ExpertReview as ExpertRating, ExpertStatistics
from apps.catalog.models import Subject, WorkType

User = get_user_model()


class ExpertRatingAPITest(TestCase):
    """Тесты для API рейтингов экспертов"""
    
    def setUp(self):
        self.client = APIClient()
        
        # Создаем пользователей
        self.client_user = User.objects.create_user(
            username='client_test',
            email='client@test.com',
            password='testpass123',
            role='client'
        )
        
        self.expert_user = User.objects.create_user(
            username='expert_test',
            email='expert@test.com',
            password='testpass123',
            role='expert'
        )
        
        # Создаем предмет и тип работы
        self.subject = Subject.objects.create(name='Математика')
        self.work_type = WorkType.objects.create(name='Контрольная')
        
        # Создаем завершенный заказ
        self.order = Order.objects.create(
            client=self.client_user,
            expert=self.expert_user,
            subject=self.subject,
            work_type=self.work_type,
            title='Тестовый заказ',
            description='Описание',
            budget=1000,
            status='completed'
        )
    
    def test_create_rating_success(self):
        """Тест успешного создания рейтинга"""
        self.client.force_authenticate(user=self.client_user)
        
        data = {
            'order': self.order.id,
            'rating': 5,
            'comment': 'Отличная работа, все выполнено в срок!'
        }
        
        response = self.client.post('/api/experts/ratings/', data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ExpertRating.objects.count(), 1)
        
        rating = ExpertRating.objects.first()
        self.assertEqual(rating.rating, 5)
        self.assertEqual(rating.expert, self.expert_user)
        self.assertEqual(rating.client, self.client_user)
    
    def test_create_rating_duplicate(self):
        """Тест создания дубликата рейтинга"""
        # Создаем первый рейтинг
        ExpertRating.objects.create(
            order=self.order,
            expert=self.expert_user,
            client=self.client_user,
            rating=5,
            comment='Первый отзыв'
        )
        
        self.client.force_authenticate(user=self.client_user)
        
        data = {
            'order': self.order.id,
            'rating': 4,
            'comment': 'Второй отзыв'
        }
        
        response = self.client.post('/api/experts/ratings/', data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(ExpertRating.objects.count(), 1)
    
    def test_get_expert_ratings(self):
        """Тест получения рейтингов эксперта"""
        # Создаем рейтинг
        ExpertRating.objects.create(
            order=self.order,
            expert=self.expert_user,
            client=self.client_user,
            rating=5,
            comment='Отличная работа!'
        )
        
        self.client.force_authenticate(user=self.client_user)
        
        response = self.client.get(f'/api/experts/ratings/?expert={self.expert_user.id}')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)
    
    def test_rating_updates_statistics(self):
        """Тест автоматического обновления статистики"""
        self.client.force_authenticate(user=self.client_user)
        
        data = {
            'order': self.order.id,
            'rating': 5,
            'comment': 'Отлично! Работа выполнена качественно и в срок.'
        }
        
        response = self.client.post('/api/experts/ratings/', data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Проверяем, что статистика обновилась
        stats = ExpertStatistics.objects.get(expert=self.expert_user)
        self.assertEqual(float(stats.average_rating), 5.0)
        self.assertEqual(stats.total_ratings, 1)



class ExpertRatingPermissionsTest(TestCase):
    """Тесты прав доступа для рейтингов"""
    
    def setUp(self):
        self.client = APIClient()
        
        # Создаем пользователей
        self.client_user = User.objects.create_user(
            username='client_perm',
            email='client_perm@test.com',
            password='testpass123',
            role='client'
        )
        
        self.expert_user = User.objects.create_user(
            username='expert_perm',
            email='expert_perm@test.com',
            password='testpass123',
            role='expert'
        )
        
        self.other_user = User.objects.create_user(
            username='other_user',
            email='other@test.com',
            password='testpass123',
            role='client'
        )
        
        # Создаем предмет и тип работы
        self.subject = Subject.objects.create(name='Физика')
        self.work_type = WorkType.objects.create(name='Лабораторная')
        
        # Создаем завершенный заказ
        self.order = Order.objects.create(
            client=self.client_user,
            expert=self.expert_user,
            subject=self.subject,
            work_type=self.work_type,
            title='Тестовый заказ для прав',
            description='Описание',
            budget=1500,
            status='completed'
        )
        
        # Создаем рейтинг
        self.rating = ExpertRating.objects.create(
            order=self.order,
            expert=self.expert_user,
            client=self.client_user,
            rating=4,
            comment='Хорошая работа, но были небольшие замечания.'
        )
    
    def test_only_client_can_create_rating(self):
        """Только клиент заказа может создать рейтинг"""
        self.client.force_authenticate(user=self.other_user)
        
        # Создаем новый заказ для теста
        order2 = Order.objects.create(
            client=self.client_user,
            expert=self.expert_user,
            subject=self.subject,
            work_type=self.work_type,
            title='Заказ 2',
            budget=1000,
            status='completed'
        )
        
        data = {
            'order': order2.id,
            'rating': 5,
            'comment': 'Отлично! Все сделано качественно.'
        }
        
        response = self.client.post('/api/experts/ratings/', data)
        
        # Другой пользователь не может создать рейтинг
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_only_owner_can_update_rating(self):
        """Только автор может обновить свой рейтинг"""
        self.client.force_authenticate(user=self.other_user)
        
        data = {
            'rating': 5,
            'comment': 'Изменил мнение, отлично!'
        }
        
        response = self.client.patch(f'/api/experts/ratings/{self.rating.id}/', data)
        
        # Другой пользователь не может видеть чужой рейтинг (404 из-за фильтрации queryset)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_owner_can_update_rating(self):
        """Автор может обновить свой рейтинг"""
        self.client.force_authenticate(user=self.client_user)
        
        data = {
            'order': self.order.id,  # Нужно передать order
            'rating': 5,
            'comment': 'Обновленный комментарий - работа выполнена отлично!'
        }
        
        response = self.client.patch(f'/api/experts/ratings/{self.rating.id}/', data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Проверяем, что данные обновились
        self.rating.refresh_from_db()
        self.assertEqual(self.rating.rating, 5)
        self.assertIn('Обновленный комментарий', self.rating.comment)
    
    def test_only_owner_can_delete_rating(self):
        """Только автор может удалить свой рейтинг"""
        self.client.force_authenticate(user=self.other_user)
        
        response = self.client.delete(f'/api/experts/ratings/{self.rating.id}/')
        
        # Другой пользователь не может видеть чужой рейтинг (404 из-за фильтрации queryset)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(ExpertRating.objects.filter(id=self.rating.id).exists())
    
    def test_cannot_rate_incomplete_order(self):
        """Нельзя оценить незавершенный заказ"""
        # Создаем незавершенный заказ
        order_new = Order.objects.create(
            client=self.client_user,
            expert=self.expert_user,
            subject=self.subject,
            work_type=self.work_type,
            title='Незавершенный заказ',
            budget=1000,
            status='in_progress'
        )
        
        self.client.force_authenticate(user=self.client_user)
        
        data = {
            'order': order_new.id,
            'rating': 5,
            'comment': 'Попытка оценить незавершенный заказ'
        }
        
        response = self.client.post('/api/experts/ratings/', data)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_expert_can_view_own_ratings(self):
        """Эксперт может просматривать свои рейтинги"""
        self.client.force_authenticate(user=self.expert_user)
        
        response = self.client.get(f'/api/experts/ratings/?expert={self.expert_user.id}')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)


@override_settings(SECURE_SSL_REDIRECT=False)
class ExpertApplicationSubmissionRegressionTests(TestCase):
    """Regression for the 500 returned by ``POST /api/experts/applications/``.

    The bug: ``NotificationService.notify_application_submitted`` was defined
    *outside* the ``NotificationService`` class (in ``EmailService``), so when
    the view called ``NotificationService.notify_application_submitted(...)``
    an ``AttributeError`` was raised after the application had been created.
    """

    def setUp(self):
        self.api_client = APIClient()
        self.specialization = Subject.objects.create(
            name='Регрессия — Анкета',
            is_active=True,
        )
        self.expert_user = User.objects.create_user(
            username='application_regression_expert',
            email='application_regression@example.com',
            password='pwd',
            role='expert',
        )

    def test_notify_application_submitted_is_class_method(self):
        """The helper must live on ``NotificationService`` so calling
        ``NotificationService.notify_application_submitted`` works."""
        from apps.notifications.services import NotificationService, EmailService
        self.assertTrue(
            hasattr(NotificationService, 'notify_application_submitted'),
            'notify_application_submitted must be defined on NotificationService',
        )
        self.assertFalse(
            hasattr(EmailService, 'notify_application_submitted'),
            'notify_application_submitted should not leak onto EmailService',
        )

    def test_post_application_returns_201_and_creates_notification(self):
        self.api_client.force_authenticate(user=self.expert_user)
        payload = {
            'full_name': 'Иван Иванов',
            'work_experience_years': 5,
            'phone': '+79991112233',
            'biography': 'Опыт работы в науке',
            'portfolio_url': '',
            'specialization_ids': [self.specialization.id],
            'educations': [
                {
                    'university': 'МГУ',
                    'start_year': 2010,
                    'end_year': 2015,
                    'degree': 'Магистр',
                }
            ],
        }
        response = self.api_client.post(
            '/api/experts/applications/', payload, format='json'
        )
        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
            f'unexpected status={response.status_code} body={response.content[:300]!r}',
        )
        body = response.json()
        self.assertEqual(body['full_name'], 'Иван Иванов')
        self.assertEqual(len(body['educations']), 1)

        # A confirmation notification should have been sent to the expert.
        from apps.notifications.models import Notification
        self.assertTrue(
            Notification.objects.filter(
                recipient=self.expert_user,
                related_object_id=body['id'],
                related_object_type='application',
            ).exists(),
            'Submitting an application must create an APPLICATION_SUBMITTED notification',
        )
