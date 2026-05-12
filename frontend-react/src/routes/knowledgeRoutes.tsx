import React, { lazy } from 'react';
import { Route } from 'react-router-dom';
import { DashboardLayout } from '@/features/layout';
import { ProtectedRoute } from '@/features/auth';

const KnowledgePortal = lazy(() => import('@/features/knowledge/pages/KnowledgePortal'));
const QuestionDetail = lazy(() => import('@/features/knowledge/pages/QuestionDetail'));
const ArticlesFeed = lazy(() => import('@/features/knowledge/pages/ArticlesFeed'));
const ArticleDetail = lazy(() => import('@/features/knowledge/pages/ArticleDetail'));
const CreateArticle = lazy(() => import('@/features/knowledge/pages/CreateArticle'));

export const knowledgeRoutes = (
  <>
    {/* Knowledge Base (Articles) */}
    <Route
      path="/knowledge-base"
      element={
        <ProtectedRoute>
          <DashboardLayout>
            <ArticlesFeed />
          </DashboardLayout>
        </ProtectedRoute>
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
        <ProtectedRoute>
          <DashboardLayout>
            <ArticleDetail />
          </DashboardLayout>
        </ProtectedRoute>
      }
    />

    {/* Knowledge Portal (Q&A) */}
    <Route
      path="/knowledge"
      element={
        <ProtectedRoute>
          <DashboardLayout>
            <KnowledgePortal />
          </DashboardLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/knowledge/:id"
      element={
        <ProtectedRoute>
          <DashboardLayout>
            <QuestionDetail />
          </DashboardLayout>
        </ProtectedRoute>
      }
    />
  </>
);
