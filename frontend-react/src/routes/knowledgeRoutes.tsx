import React, { lazy } from 'react';
import { Route } from 'react-router-dom';
import { DashboardLayout } from '@/features/layout';
import PublicLayout from '@/features/layout/components/PublicLayout';
import { ProtectedRoute } from '@/features/auth';

const KnowledgePortal = lazy(() => import('@/features/knowledge/pages/KnowledgePortal'));
const QuestionDetail = lazy(() => import('@/features/knowledge/pages/QuestionDetail'));
const ArticlesFeed = lazy(() => import('@/features/knowledge/pages/ArticlesFeed'));
const ArticleDetail = lazy(() => import('@/features/knowledge/pages/ArticleDetail'));
const CreateArticle = lazy(() => import('@/features/knowledge/pages/CreateArticle'));

export const knowledgeRoutes = (
  <>
    {/* Knowledge Base (Articles) — публичное чтение для SEO */}
    <Route
      path="/knowledge-base"
      element={
        <PublicLayout>
          <ArticlesFeed />
        </PublicLayout>
      }
    />
    <Route
      path="/knowledge-base/create"
      element={
        <ProtectedRoute>
          <DashboardLayout>
            <CreateArticle />
          </DashboardLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/knowledge-base/:id"
      element={
        <PublicLayout>
          <ArticleDetail />
        </PublicLayout>
      }
    />

    {/* Knowledge Portal (Q&A) — публичное чтение для SEO */}
    <Route
      path="/knowledge"
      element={
        <PublicLayout>
          <KnowledgePortal />
        </PublicLayout>
      }
    />
    <Route
      path="/knowledge/:id"
      element={
        <PublicLayout>
          <QuestionDetail />
        </PublicLayout>
      }
    />
  </>
);
