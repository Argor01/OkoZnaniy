from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from apps.orders.models import Order
from apps.experts.models import ExpertRating, ExpertStatistics
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
