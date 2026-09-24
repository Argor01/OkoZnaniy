from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.cache import cache
from rest_framework.test import APIClient
from apps.catalog.models import Subject, WorkType
from apps.orders.models import Order, ClientReview
from apps.experts.models import ExpertReview, ExpertStatistics
from apps.admin_panel.models import AdminActionLog
from apps.notifications.models import LandingInquiry
from apps.chat.models import Chat, Message
from apps.arbitration.models import ArbitrationCase

User = get_user_model()

@override_settings(SECURE_SSL_REDIRECT=False)
class ReviewsTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username='review_admin', role='admin')
        self.client_user = User.objects.create_user(username='review_client', role='client')
        self.expert = User.objects.create_user(username='review_expert', role='expert')
        self.order = Order.objects.create(client=self.client_user, expert=self.expert,
            subject=Subject.objects.create(name='Test subject'), work_type=WorkType.objects.create(name='Test work'),
            title='Review test', description='Test', budget=Decimal('1000'), deadline=timezone.now()+timedelta(days=3), status='completed')
        self.review = ExpertReview.objects.create(order=self.order, client=self.client_user, expert=self.expert, rating=5, comment='Test review')
        self.client_review = ClientReview.objects.create(order=self.order, client=self.client_user, expert=self.expert, rating=4, comment='Client review')
        self.api = APIClient()
    def test_anonymous_denied(self):
        self.assertIn(self.api.get('/api/admin-panel/reviews/').status_code, [401, 403])
    def test_customer_cannot_list_or_delete(self):
        self.api.force_authenticate(self.client_user)
        self.assertEqual(self.api.get('/api/admin-panel/reviews/').status_code, 403)
        self.assertEqual(self.api.delete(f'/api/admin-panel/reviews/expert/{self.review.pk}/', {'reason':'Test'}, format='json').status_code, 403)
        self.assertTrue(ExpertReview.objects.filter(pk=self.review.pk).exists())
    def test_admin_lists_both_kinds(self):
        self.api.force_authenticate(self.admin)
        for kind in ('client','expert'):
            r=self.api.get('/api/admin-panel/reviews/', {'kind':kind})
            self.assertEqual(r.status_code,200)
            self.assertEqual(r.data['count'],1)
    def test_reason_required(self):
        self.api.force_authenticate(self.admin)
        self.assertEqual(self.api.delete(f'/api/admin-panel/reviews/expert/{self.review.pk}/', {}, format='json').status_code,400)
    def test_delete_expert_review_recounts_and_audits(self):
        self.api.force_authenticate(self.admin)
        r=self.api.delete(f'/api/admin-panel/reviews/expert/{self.review.pk}/', {'reason':'Duplicate review'}, format='json')
        self.assertEqual(r.status_code,204, r.content)
        self.assertFalse(ExpertReview.objects.filter(pk=self.review.pk).exists())
        stats=ExpertStatistics.objects.get(expert=self.expert)
        self.assertEqual(stats.average_rating,0); self.assertEqual(stats.total_ratings,0)
        self.assertTrue(AdminActionLog.objects.filter(action='review_deleted').exists())
        self.assertTrue(ClientReview.objects.filter(pk=self.client_review.pk).exists())
    def test_director_deletes_client_review(self):
        self.admin.role='director';self.admin.save(update_fields=['role'])
        self.api.force_authenticate(self.admin)
        r=self.api.delete(f'/api/admin-panel/reviews/client/{self.client_review.pk}/', {'reason':'Duplicate review'}, format='json')
        self.assertEqual(r.status_code,204)
        self.assertTrue(ExpertReview.objects.filter(pk=self.review.pk).exists())
    def test_closed_order_chat_remains_readable(self):
        self.order.status='cancelled';self.order.save(update_fields=['status'])
        chat=Chat.objects.create(order=self.order,client=self.client_user,expert=self.expert)
        chat.participants.add(self.client_user,self.expert)
        Message.objects.create(chat=chat,sender=self.client_user,text='Order history')
        ArbitrationCase.objects.create(order=self.order,plaintiff=self.client_user,defendant=self.expert,reason='poor_quality',subject='Test',description='Test',status='closed')
        for user in (self.client_user,self.expert):
            self.api.force_authenticate(user)
            response=self.api.get(f'/api/chat/chats/{chat.pk}/')
            self.assertEqual(response.status_code,200)
            self.assertEqual(response.data['messages'][0]['text'],'Order history')
    def test_direct_offer_dispute_evidence_preserved(self):
        chat=Chat.objects.create(client=self.client_user,expert=self.expert)
        chat.participants.add(self.client_user,self.expert)
        Message.objects.create(chat=chat,sender=self.client_user,text='Offer',message_type='offer',offer_data={'status':'accepted','order_id':self.order.pk})
        ArbitrationCase.objects.create(order=self.order,plaintiff=self.client_user,defendant=self.expert,reason='poor_quality',subject='Test',description='Test',status='closed')
        for user in (self.client_user,self.expert):
            self.api.force_authenticate(user)
            self.assertEqual(self.api.delete(f'/api/chat/chats/{chat.pk}/').status_code,204)
        self.assertTrue(Chat.objects.filter(pk=chat.pk).exists())
        self.assertEqual(chat.messages.count(),1)

@override_settings(SECURE_SSL_REDIRECT=False, EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class InquiryTests(TestCase):
    def setUp(self):
        cache.clear();self.api=APIClient()
        self.data={'kind':'vacancy','vacancy':'Администратор','name':'Test applicant','email':'test@example.com','consent':True}
    def test_vacancy_persisted_and_staff_emailed(self):
        from django.core import mail
        r=self.api.post('/api/notifications/landing-inquiry/',self.data,format='json')
        self.assertEqual(r.status_code,201,r.content)
        self.assertEqual(LandingInquiry.objects.count(),1)
        self.assertEqual(mail.outbox[0].to,['partners.okoznaniy@mail.ru'])
        self.assertEqual(mail.outbox[0].reply_to,['test@example.com'])
    def test_agency_phone_only(self):
        r=self.api.post('/api/notifications/landing-inquiry/',{'kind':'agency','name':'Test agency','phone':'+7 (999) 123-45-67','consent':True},format='json')
        self.assertEqual(r.status_code,201,r.content)
    def test_requires_consent(self):
        self.data['consent']=False
        self.assertEqual(self.api.post('/api/notifications/landing-inquiry/',self.data,format='json').status_code,400)
        self.assertEqual(LandingInquiry.objects.count(),0)
    def test_invalid_contact(self):
        self.data['email']='not-email'
        self.assertEqual(self.api.post('/api/notifications/landing-inquiry/',self.data,format='json').status_code,400)
    def test_invalid_phone(self):
        self.data['phone']='123'
        self.assertEqual(self.api.post('/api/notifications/landing-inquiry/',self.data,format='json').status_code,400)
    def test_rejects_unknown_vacancy(self):
        self.data['vacancy']='Other'
        self.assertEqual(self.api.post('/api/notifications/landing-inquiry/',self.data,format='json').status_code,400)
    def test_honeypot(self):
        self.data['website']='spam'
        self.assertEqual(self.api.post('/api/notifications/landing-inquiry/',self.data,format='json').status_code,400)
    @patch('apps.notifications.lead_views.EmailMessage.send', side_effect=OSError('Test SMTP failure'))
    def test_delivery_failure_does_not_lose_application(self,send):
        self.assertEqual(self.api.post('/api/notifications/landing-inquiry/',self.data,format='json').status_code,201)
        self.assertEqual(LandingInquiry.objects.count(),1)
        self.assertIsNone(LandingInquiry.objects.get().emailed_at)
    def test_rate_limit(self):
        for i in range(5):
            self.api.post('/api/notifications/landing-inquiry/',{},format='json')
        self.assertEqual(self.api.post('/api/notifications/landing-inquiry/',{},format='json').status_code,429)
