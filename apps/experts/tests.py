from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from apps.orders.models import Order
from apps.experts.models import ExpertReview as ExpertRating, ExpertStatistics
from apps.catalog.models import Subject, WorkType

User = get_user_model()


class ExpertRatingAPITest(TestCase):
    """РўРµСЃС‚С‹ РґР»СЏ API СЂРµР№С‚РёРЅРіРѕРІ СЌРєСЃРїРµСЂС‚РѕРІ"""
    
    def setUp(self):
        self.client = APIClient()
        
        # РЎРѕР·РґР°РµРј РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№
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
        
        # РЎРѕР·РґР°РµРј РїСЂРµРґРјРµС‚ Рё С‚РёРї СЂР°Р±РѕС‚С‹
        self.subject, _ = Subject.objects.get_or_create(name='РњР°С‚РµРјР°С‚РёРєР°')
        self.work_type, _ = WorkType.objects.get_or_create(name='РљРѕРЅС‚СЂРѕР»СЊРЅР°СЏ')
        
        # РЎРѕР·РґР°РµРј Р·Р°РІРµСЂС€РµРЅРЅС‹Р№ Р·Р°РєР°Р·
        self.order = Order.objects.create(
            client=self.client_user,
            expert=self.expert_user,
            subject=self.subject,
            work_type=self.work_type,
            title='РўРµСЃС‚РѕРІС‹Р№ Р·Р°РєР°Р·',
            description='РћРїРёСЃР°РЅРёРµ',
            budget=1000,
            status='completed'
        )
    
    def test_create_rating_success(self):
        """РўРµСЃС‚ СѓСЃРїРµС€РЅРѕРіРѕ СЃРѕР·РґР°РЅРёСЏ СЂРµР№С‚РёРЅРіР°"""
        self.client.force_authenticate(user=self.client_user)
        
        data = {
            'order': self.order.id,
            'rating': 5,
            'comment': 'РћС‚Р»РёС‡РЅР°СЏ СЂР°Р±РѕС‚Р°, РІСЃРµ РІС‹РїРѕР»РЅРµРЅРѕ РІ СЃСЂРѕРє!'
        }
        
        response = self.client.post('/api/experts/ratings/', data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ExpertRating.objects.count(), 1)
        
        rating = ExpertRating.objects.first()
        self.assertEqual(rating.rating, 5)
        self.assertEqual(rating.expert, self.expert_user)
        self.assertEqual(rating.client, self.client_user)
    
    def test_create_rating_duplicate(self):
        """РўРµСЃС‚ СЃРѕР·РґР°РЅРёСЏ РґСѓР±Р»РёРєР°С‚Р° СЂРµР№С‚РёРЅРіР°"""
        # РЎРѕР·РґР°РµРј РїРµСЂРІС‹Р№ СЂРµР№С‚РёРЅРі
        ExpertRating.objects.create(
            order=self.order,
            expert=self.expert_user,
            client=self.client_user,
            rating=5,
            comment='РџРµСЂРІС‹Р№ РѕС‚Р·С‹РІ'
        )
        
        self.client.force_authenticate(user=self.client_user)
        
        data = {
            'order': self.order.id,
            'rating': 4,
            'comment': 'Р’С‚РѕСЂРѕР№ РѕС‚Р·С‹РІ'
        }
        
        response = self.client.post('/api/experts/ratings/', data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(ExpertRating.objects.count(), 1)
    
    def test_get_expert_ratings(self):
        """РўРµСЃС‚ РїРѕР»СѓС‡РµРЅРёСЏ СЂРµР№С‚РёРЅРіРѕРІ СЌРєСЃРїРµСЂС‚Р°"""
        # РЎРѕР·РґР°РµРј СЂРµР№С‚РёРЅРі
        ExpertRating.objects.create(
            order=self.order,
            expert=self.expert_user,
            client=self.client_user,
            rating=5,
            comment='РћС‚Р»РёС‡РЅР°СЏ СЂР°Р±РѕС‚Р°!'
        )
        
        self.client.force_authenticate(user=self.client_user)
        
        response = self.client.get(f'/api/experts/ratings/?expert={self.expert_user.id}')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)
    
    def test_rating_updates_statistics(self):
        """РўРµСЃС‚ Р°РІС‚РѕРјР°С‚РёС‡РµСЃРєРѕРіРѕ РѕР±РЅРѕРІР»РµРЅРёСЏ СЃС‚Р°С‚РёСЃС‚РёРєРё"""
        self.client.force_authenticate(user=self.client_user)
        
        data = {
            'order': self.order.id,
            'rating': 5,
            'comment': 'РћС‚Р»РёС‡РЅРѕ! Р Р°Р±РѕС‚Р° РІС‹РїРѕР»РЅРµРЅР° РєР°С‡РµСЃС‚РІРµРЅРЅРѕ Рё РІ СЃСЂРѕРє.'
        }
        
        response = self.client.post('/api/experts/ratings/', data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # РџСЂРѕРІРµСЂСЏРµРј, С‡С‚Рѕ СЃС‚Р°С‚РёСЃС‚РёРєР° РѕР±РЅРѕРІРёР»Р°СЃСЊ
        stats = ExpertStatistics.objects.get(expert=self.expert_user)
        self.assertEqual(float(stats.average_rating), 5.0)
        self.assertEqual(stats.total_ratings, 1)



class ExpertRatingPermissionsTest(TestCase):
    """РўРµСЃС‚С‹ РїСЂР°РІ РґРѕСЃС‚СѓРїР° РґР»СЏ СЂРµР№С‚РёРЅРіРѕРІ"""
    
    def setUp(self):
        self.client = APIClient()
        
        # РЎРѕР·РґР°РµРј РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№
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
        
        # РЎРѕР·РґР°РµРј РїСЂРµРґРјРµС‚ Рё С‚РёРї СЂР°Р±РѕС‚С‹
        self.subject, _ = Subject.objects.get_or_create(name='Р¤РёР·РёРєР°')
        self.work_type, _ = WorkType.objects.get_or_create(name='Р›Р°Р±РѕСЂР°С‚РѕСЂРЅР°СЏ')
        
        # РЎРѕР·РґР°РµРј Р·Р°РІРµСЂС€РµРЅРЅС‹Р№ Р·Р°РєР°Р·
        self.order = Order.objects.create(
            client=self.client_user,
            expert=self.expert_user,
            subject=self.subject,
            work_type=self.work_type,
            title='РўРµСЃС‚РѕРІС‹Р№ Р·Р°РєР°Р· РґР»СЏ РїСЂР°РІ',
            description='РћРїРёСЃР°РЅРёРµ',
            budget=1500,
            status='completed'
        )
        
        # РЎРѕР·РґР°РµРј СЂРµР№С‚РёРЅРі
        self.rating = ExpertRating.objects.create(
            order=self.order,
            expert=self.expert_user,
            client=self.client_user,
            rating=4,
            comment='РҐРѕСЂРѕС€Р°СЏ СЂР°Р±РѕС‚Р°, РЅРѕ Р±С‹Р»Рё РЅРµР±РѕР»СЊС€РёРµ Р·Р°РјРµС‡Р°РЅРёСЏ.'
        )
    
    def test_only_client_can_create_rating(self):
        """РўРѕР»СЊРєРѕ РєР»РёРµРЅС‚ Р·Р°РєР°Р·Р° РјРѕР¶РµС‚ СЃРѕР·РґР°С‚СЊ СЂРµР№С‚РёРЅРі"""
        self.client.force_authenticate(user=self.other_user)
        
        # РЎРѕР·РґР°РµРј РЅРѕРІС‹Р№ Р·Р°РєР°Р· РґР»СЏ С‚РµСЃС‚Р°
        order2 = Order.objects.create(
            client=self.client_user,
            expert=self.expert_user,
            subject=self.subject,
            work_type=self.work_type,
            title='Р—Р°РєР°Р· 2',
            budget=1000,
            status='completed'
        )
        
        data = {
            'order': order2.id,
            'rating': 5,
            'comment': 'РћС‚Р»РёС‡РЅРѕ! Р’СЃРµ СЃРґРµР»Р°РЅРѕ РєР°С‡РµСЃС‚РІРµРЅРЅРѕ.'
        }
        
        response = self.client.post('/api/experts/ratings/', data)
        
        # Р”СЂСѓРіРѕР№ РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ РЅРµ РјРѕР¶РµС‚ СЃРѕР·РґР°С‚СЊ СЂРµР№С‚РёРЅРі
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_only_owner_can_update_rating(self):
        """РўРѕР»СЊРєРѕ Р°РІС‚РѕСЂ РјРѕР¶РµС‚ РѕР±РЅРѕРІРёС‚СЊ СЃРІРѕР№ СЂРµР№С‚РёРЅРі"""
        self.client.force_authenticate(user=self.other_user)
        
        data = {
            'rating': 5,
            'comment': 'РР·РјРµРЅРёР» РјРЅРµРЅРёРµ, РѕС‚Р»РёС‡РЅРѕ!'
        }
        
        response = self.client.patch(f'/api/experts/ratings/{self.rating.id}/', data)
        
        # Р”СЂСѓРіРѕР№ РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ РЅРµ РјРѕР¶РµС‚ РІРёРґРµС‚СЊ С‡СѓР¶РѕР№ СЂРµР№С‚РёРЅРі (404 РёР·-Р·Р° С„РёР»СЊС‚СЂР°С†РёРё queryset)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_owner_can_update_rating(self):
        """РђРІС‚РѕСЂ РјРѕР¶РµС‚ РѕР±РЅРѕРІРёС‚СЊ СЃРІРѕР№ СЂРµР№С‚РёРЅРі"""
        self.client.force_authenticate(user=self.client_user)
        
        data = {
            'order': self.order.id,  # РќСѓР¶РЅРѕ РїРµСЂРµРґР°С‚СЊ order
            'rating': 5,
            'comment': 'РћР±РЅРѕРІР»РµРЅРЅС‹Р№ РєРѕРјРјРµРЅС‚Р°СЂРёР№ - СЂР°Р±РѕС‚Р° РІС‹РїРѕР»РЅРµРЅР° РѕС‚Р»РёС‡РЅРѕ!'
        }
        
        response = self.client.patch(f'/api/experts/ratings/{self.rating.id}/', data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # РџСЂРѕРІРµСЂСЏРµРј, С‡С‚Рѕ РґР°РЅРЅС‹Рµ РѕР±РЅРѕРІРёР»РёСЃСЊ
        self.rating.refresh_from_db()
        self.assertEqual(self.rating.rating, 5)
        self.assertIn('РћР±РЅРѕРІР»РµРЅРЅС‹Р№ РєРѕРјРјРµРЅС‚Р°СЂРёР№', self.rating.comment)
    
    def test_only_owner_can_delete_rating(self):
        """РўРѕР»СЊРєРѕ Р°РІС‚РѕСЂ РјРѕР¶РµС‚ СѓРґР°Р»РёС‚СЊ СЃРІРѕР№ СЂРµР№С‚РёРЅРі"""
        self.client.force_authenticate(user=self.other_user)
        
        response = self.client.delete(f'/api/experts/ratings/{self.rating.id}/')
        
        # Р”СЂСѓРіРѕР№ РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ РЅРµ РјРѕР¶РµС‚ РІРёРґРµС‚СЊ С‡СѓР¶РѕР№ СЂРµР№С‚РёРЅРі (404 РёР·-Р·Р° С„РёР»СЊС‚СЂР°С†РёРё queryset)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(ExpertRating.objects.filter(id=self.rating.id).exists())
    
    def test_cannot_rate_incomplete_order(self):
        """РќРµР»СЊР·СЏ РѕС†РµРЅРёС‚СЊ РЅРµР·Р°РІРµСЂС€РµРЅРЅС‹Р№ Р·Р°РєР°Р·"""
        # РЎРѕР·РґР°РµРј РЅРµР·Р°РІРµСЂС€РµРЅРЅС‹Р№ Р·Р°РєР°Р·
        order_new = Order.objects.create(
            client=self.client_user,
            expert=self.expert_user,
            subject=self.subject,
            work_type=self.work_type,
            title='РќРµР·Р°РІРµСЂС€РµРЅРЅС‹Р№ Р·Р°РєР°Р·',
            budget=1000,
            status='in_progress'
        )
        
        self.client.force_authenticate(user=self.client_user)
        
        data = {
            'order': order_new.id,
            'rating': 5,
            'comment': 'РџРѕРїС‹С‚РєР° РѕС†РµРЅРёС‚СЊ РЅРµР·Р°РІРµСЂС€РµРЅРЅС‹Р№ Р·Р°РєР°Р·'
        }
        
        response = self.client.post('/api/experts/ratings/', data)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_expert_can_view_own_ratings(self):
        """Р­РєСЃРїРµСЂС‚ РјРѕР¶РµС‚ РїСЂРѕСЃРјР°С‚СЂРёРІР°С‚СЊ СЃРІРѕРё СЂРµР№С‚РёРЅРіРё"""
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
            name='Р РµРіСЂРµСЃСЃРёСЏ вЂ” РђРЅРєРµС‚Р°',
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
            'full_name': 'РРІР°РЅ РРІР°РЅРѕРІ',
            'work_experience_years': 5,
            'phone': '+79991112233',
            'biography': 'РћРїС‹С‚ СЂР°Р±РѕС‚С‹ РІ РЅР°СѓРєРµ',
            'portfolio_url': '',
            'specialization_ids': [self.specialization.id],
            'educations': [
                {
                    'university': 'РњР“РЈ',
                    'start_year': 2010,
                    'end_year': 2015,
                    'degree': 'РњР°РіРёСЃС‚СЂ',
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
        self.assertEqual(body['full_name'], 'РРІР°РЅ РРІР°РЅРѕРІ')
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

