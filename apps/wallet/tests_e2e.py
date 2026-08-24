from datetime import timedelta
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase,override_settings
from django.utils import timezone
from rest_framework.test import APIClient
from apps.catalog.models import Subject,WorkType
from apps.orders.models import Bid,Order,OrderFile,Transaction,TransactionType
from apps.payments.models import Payment
from apps.shop.models import Purchase,ReadyWork
from apps.users.models import PartnerEarning
from apps.wallet.models import WithdrawalRequest
from apps.wallet.services import WalletService,get_system_account
User=get_user_model()

@override_settings(PAYMENTS_SANDBOX=True,SECURE_SSL_REDIRECT=False)
class WalletInteractionE2E(TestCase):
 @classmethod
 def setUpTestData(c):
  c.s=Subject.objects.create(name='Wallet E2E subject'); c.wt=WorkType.objects.create(name='Wallet E2E type')
  c.p=User.objects.create_user(username='e2ep',role='partner',partner_commission_rate=25)
  c.c=User.objects.create_user(username='e2ec',email='e2ec@okoznaniy.test',role='client',partner=c.p,partner_linked_at=timezone.now())
  c.e=User.objects.create_user(username='e2ee',email='e2ee@okoznaniy.test',role='expert')
 def setUp(self): self.api=APIClient()
 def auth(self,u): self.api.force_authenticate(u)
 def test_auth_required(self):
  for verb,path,data in [('get','/api/wallet/me/',{}),('get','/api/wallet/stats/',{}),('get','/api/wallet/transactions/',{}),('post','/api/wallet/topup/',{'amount':100,'payment_method':'sberpay_qr'}),('post','/api/wallet/withdraw/',{'amount':100,'card_number':'4111111111111111'})]:
   self.assertIn(getattr(self.api,verb)(path,data,format='json').status_code,(401,403))
 def test_topup_fee_idempotency_and_history(self):
  self.auth(self.c); data={'amount':'1000','payment_method':'sberpay_qr'}
  a=self.api.post('/api/wallet/topup/',data,format='json'); b=self.api.post('/api/wallet/topup/',data,format='json')
  self.assertEqual(a.status_code,200,a.content); self.assertEqual(a.json()['payment_id'],b.json()['payment_id'])
  self.assertEqual(Decimal(a.json()['amount']),Decimal('1015')); self.assertEqual(Decimal(a.json()['wallet_credit']),Decimal('1000')); self.assertEqual(Decimal(a.json()['acquiring_fee']),Decimal('15'))
  self.c.refresh_from_db(); self.assertEqual(self.c.balance,1000); self.assertEqual(Payment.objects.filter(user=self.c).count(),1); self.assertEqual(Transaction.objects.filter(user=self.c,type=TransactionType.TOPUP).count(),1)
  h=self.api.get('/api/wallet/transactions/'); st=self.api.get('/api/wallet/stats/'); me=self.api.get('/api/wallet/me/')
  self.assertEqual(h.json()[0]['type'],'topup'); self.assertEqual(Decimal(st.json()['total_topup']),1000); self.assertEqual(Decimal(me.json()['available_balance']),1000)
 def test_withdraw_fees_by_role(self):
  WalletService.topup(self.e,1000); self.auth(self.e); r=self.api.post('/api/wallet/withdraw/',{'amount':1000,'card_number':'4111111111111111'},format='json')
  self.assertEqual(r.status_code,201,r.content); self.assertEqual([Decimal(r.json()[x]) for x in ('platform_fee','acquiring_fee','amount')],[Decimal('150'),Decimal('15'),Decimal('835')]); self.assertEqual(WithdrawalRequest.objects.get(pk=r.json()['withdrawal_id']).card_number,'**** **** **** 1111')
  sys=get_system_account(); sys.refresh_from_db(); self.assertEqual(sys.balance,150)
  WalletService.topup(self.c,1000); self.auth(self.c); r=self.api.post('/api/wallet/withdraw/',{'amount':1000,'card_number':'5555444433332222'},format='json')
  self.assertEqual(r.status_code,201,r.content); self.assertEqual(Decimal(r.json()['platform_fee']),0); self.assertEqual(Decimal(r.json()['amount']),985)
 def test_order_prepayment_remaining_and_approval(self):
  WalletService.topup(self.c,1250); o=Order.objects.create(client=self.c,subject=self.s,work_type=self.wt,title='E2E',description='flow',budget=1000,deadline=timezone.now()+timedelta(days=5),status='new'); b=Bid.objects.create(order=o,expert=self.e,amount=1000,prepayment_percent=50)
  self.auth(self.c); r=self.api.post(f'/api/orders/orders/{o.id}/accept_bid/',{'bid_id':b.id},format='json'); self.assertEqual(r.status_code,200,r.content)
  self.auth(self.e); r=self.api.post(f'/api/orders/orders/{o.id}/accept_assignment/',{},format='json'); self.assertEqual(r.status_code,200,r.content); self.c.refresh_from_db(); self.e.refresh_from_db(); self.p.refresh_from_db(); self.assertEqual(self.c.frozen_balance,0); self.assertEqual(self.e.frozen_balance,500); self.assertEqual(self.p.frozen_balance,125)
  self.auth(self.c); r=self.api.post(f'/api/orders/orders/{o.id}/pay-remaining/',{},format='json'); self.assertEqual(r.status_code,200,r.content); self.c.refresh_from_db(); self.e.refresh_from_db(); self.p.refresh_from_db(); self.assertEqual(self.c.frozen_balance,0); self.assertEqual(self.e.frozen_balance,1000); self.assertEqual(self.p.frozen_balance,250)
  o.status='review'; o.save(update_fields=['status']); OrderFile.objects.create(order=o,file=SimpleUploadedFile('solution.txt', b'solution'),file_type='solution',uploaded_by=self.e,client_downloaded_at=timezone.now()); r=self.api.post(f'/api/orders/orders/{o.id}/approve/',{},format='json'); self.assertEqual(r.status_code,200,r.content)
  self.c.refresh_from_db(); self.e.refresh_from_db(); self.p.refresh_from_db(); self.assertEqual((self.c.balance,self.c.frozen_balance,self.e.balance,self.p.balance),(0,0,1000,250)); pe=PartnerEarning.objects.get(order=o); self.assertTrue(pe.is_paid)
 def test_partial_order_cannot_release(self):
  WalletService.topup(self.c,1250); o=Order.objects.create(client=self.c,expert=self.e,subject=self.s,work_type=self.wt,title='partial',description='partial',budget=1000,deadline=timezone.now()+timedelta(days=5),status='review'); WalletService.hold(self.c,625,order=o)
  self.auth(self.c); r=self.api.post(f'/api/orders/orders/{o.id}/approve/',{},format='json'); self.assertEqual(r.status_code,400); self.e.refresh_from_db(); o.refresh_from_db(); self.assertEqual(self.e.balance,0); self.assertEqual(o.status,'review')
 def test_ready_work_10_day_hold_and_early_confirmation(self):
  w=ReadyWork.objects.create(title='ready',description='ready',price=400,subject=self.s,work_type=self.wt,author=self.e,is_active=True,moderation_status=ReadyWork.ModerationStatus.APPROVED); WalletService.topup(self.c,500); self.auth(self.c)
  r=self.api.post(f'/api/shop/works/{w.id}/purchase/',{},format='json'); self.assertEqual(r.status_code,201,r.content); p=Purchase.objects.get(pk=r.json()['id']); self.assertGreater(p.hold_until,timezone.now()+timedelta(days=9, hours=23)); self.c.refresh_from_db(); self.e.refresh_from_db(); self.p.refresh_from_db(); self.assertEqual(self.c.frozen_balance,0); self.assertEqual(self.e.frozen_balance,400); self.assertEqual(self.p.frozen_balance,100)
  r=self.api.post(f'/api/shop/purchases/{p.id}/confirm-completion/',{},format='json'); self.assertEqual(r.status_code,200,r.content); self.c.refresh_from_db(); self.e.refresh_from_db(); self.p.refresh_from_db(); p.refresh_from_db(); self.assertEqual((p.status,self.c.balance,self.c.frozen_balance,self.e.balance,self.p.balance),(Purchase.Status.COMPLETED,0,0,400,100))
 def test_validation_is_atomic(self):
  self.auth(self.c)
  self.assertEqual(self.api.post('/api/wallet/withdraw/',{'amount':100,'card_number':'123'},format='json').status_code,400)
  self.assertEqual(self.api.post('/api/wallet/withdraw/',{'amount':100,'card_number':'4111111111111111'},format='json').status_code,400)
  self.assertEqual(self.api.post('/api/wallet/topup/',{'amount':99,'payment_method':'sberpay_qr'},format='json').status_code,400)
  self.c.refresh_from_db(); self.assertEqual(self.c.balance,0); self.assertFalse(WithdrawalRequest.objects.filter(user=self.c).exists())
 def test_completed_order_refund_claws_back_partner_and_creates_expert_debt(self):
  WalletService.topup(self.c,1250); o=Order.objects.create(client=self.c,expert=self.e,subject=self.s,work_type=self.wt,title='refund later',description='refund',budget=1000,deadline=timezone.now()+timedelta(days=2),status='review'); WalletService.fund_distributed_escrow(client=self.c,expert=self.e,base_amount=1000,service_fee=250,fund_amount=1250,order=o)
  OrderFile.objects.create(order=o,file=SimpleUploadedFile('solution.txt', b'solution'),file_type='solution',uploaded_by=self.e,client_downloaded_at=timezone.now()); self.auth(self.c); done=self.api.post(f'/api/orders/orders/{o.id}/approve/',{},format='json'); self.assertEqual(done.status_code,200,done.content)
  st=o.wallet_settlement; self.e.refresh_from_db(); self.e.balance=0; self.e.save(update_fields=['balance'])
  result=WalletService.clawback_settlement(st,50,description='E2E поздний возврат')
  self.assertEqual(result['refund'],Decimal('625')); self.c.refresh_from_db(); self.e.refresh_from_db(); self.p.refresh_from_db()
  self.assertEqual(self.c.balance,625); self.assertEqual(self.e.debt_balance,500); self.assertEqual(self.p.balance,125)
  self.assertTrue(Transaction.objects.filter(user=self.e,type=TransactionType.CLAWBACK).exists())
  WalletService.topup(self.e,500); self.e.refresh_from_db(); self.assertEqual(self.e.debt_balance,0); self.assertEqual(self.e.balance,0)
 def test_completed_purchase_has_settlement_for_late_refund(self):
  w=ReadyWork.objects.create(title='late ready',description='ready',price=400,subject=self.s,work_type=self.wt,author=self.e,is_active=True,moderation_status=ReadyWork.ModerationStatus.APPROVED); WalletService.topup(self.c,500); self.auth(self.c)
  bought=self.api.post(f'/api/shop/works/{w.id}/purchase/',{},format='json'); p=Purchase.objects.get(pk=bought.json()['id']); confirmed=self.api.post(f'/api/shop/purchases/{p.id}/confirm-completion/',{},format='json'); self.assertEqual(confirmed.status_code,200,confirmed.content)
  self.assertEqual(p.wallet_settlement.base_amount,Decimal('400')); result=WalletService.clawback_settlement(p.wallet_settlement,50); self.assertEqual(result['refund'],Decimal('250'))
