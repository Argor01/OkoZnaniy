import React, { lazy } from 'react';
import { Route } from 'react-router-dom';
import { ROUTES } from '@/utils/constants';

const Home = lazy(() => import('@/features/home/pages/Home'));
const Login = lazy(() => import('@/features/auth/pages/Login'));
const GoogleCallback = lazy(() => import('@/features/auth/pages/GoogleCallback'));
const ReferralRedirect = lazy(() => import('@/features/auth/pages/ReferralRedirect'));
const RegisterWithEmailVerification = lazy(() => import('@/features/auth/pages/RegisterWithEmailVerification'));
const BecomeExpert = lazy(() => import('@/features/expert/pages/BecomeExpert'));
const BecomePartner = lazy(() => import('@/features/partner/pages/BecomePartner'));
const LandingV2 = lazy(() => import('@/features/landing-v2/pages/LandingV2'));

export const authRoutes = (
  <>
    <Route path={ROUTES.home} element={<LandingV2 />} />
    <Route path="/len_v1" element={<Home />} />
    <Route path="/len_v2" element={<LandingV2 />} />
    <Route path={ROUTES.login} element={<Login />} />
    <Route path="/register" element={<RegisterWithEmailVerification />} />
    <Route path={ROUTES.auth.googleCallback} element={<GoogleCallback />} />
    <Route path={ROUTES.auth.googleCallbackLegacy} element={<GoogleCallback />} />
    <Route path="/ref/:code" element={<ReferralRedirect />} />
    <Route path="/referral/:code" element={<ReferralRedirect />} />
    <Route path="/r/:code" element={<ReferralRedirect />} />
    <Route path={ROUTES.becomeExpert} element={<BecomeExpert />} />
    <Route path={ROUTES.becomePartner} element={<BecomePartner />} />
  </>
);

