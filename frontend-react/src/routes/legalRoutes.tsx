import React, { lazy } from 'react';
import { Route } from 'react-router-dom';
import PublicLayout from '@/features/layout/components/PublicLayout';

const ContactsPage = lazy(() => import('@/features/legal/pages/ContactsPage'));
const OfferPage = lazy(() => import('@/features/legal/pages/OfferPage'));
const PaymentAndRefundPage = lazy(() => import('@/features/legal/pages/PaymentAndRefundPage'));

/**
 * Публичные правовые страницы. Доступны без авторизации — этого требует
 * банк-эквайер: проверяющий должен открыть реквизиты, оферту и правила
 * возврата, не заводя учётную запись.
 */
export const legalRoutes = (
  <>
    <Route
      path="/contacts"
      element={
        <PublicLayout>
          <ContactsPage />
        </PublicLayout>
      }
    />
    <Route
      path="/offer"
      element={
        <PublicLayout>
          <OfferPage />
        </PublicLayout>
      }
    />
    <Route
      path="/payment-and-refund"
      element={
        <PublicLayout>
          <PaymentAndRefundPage />
        </PublicLayout>
      }
    />
  </>
);
