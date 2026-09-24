import React, { useState } from 'react';
import { Alert, Card, Empty, Segmented, Spin, Tag, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { partnerApplicationsApi } from '@/features/partner/api/partnerApplications';

type Site = { kind: 'vacancy' | 'agency'; name: string; email?: string; phone?: string; message?: string; vacancy?: string; created_at: string; processed: boolean };
const labels = { partner: 'Партнёры', expert: 'Эксперты', vacancy: 'Вакансии', agency: 'Агентства' } as const;
export default function RequestsInbox() {
  const [tab, setTab] = useState('all');
  const site = useQuery({ queryKey: ['director-site-inquiries'], queryFn: async () => (await apiClient.get('/notifications/landing-inquiries/')).data as Site[], refetchInterval: 30000 });
  const partners = useQuery({ queryKey: ['director-partner-applications'], queryFn: () => partnerApplicationsApi.list(), refetchInterval: 30000 });
  const rows = [
    ...(partners.data || []).map((x: any) => ({ kind: 'partner', name: x.full_name, contact: [x.email, x.phone, x.telegram].filter(Boolean).join(' · '), text: x.comment || '', status: x.status, date: x.created_at })),
    ...(site.data || []).map(x => ({ kind: x.kind, name: x.name, contact: [x.email, x.phone].filter(Boolean).join(' · '), text: x.message || x.vacancy || '', status: x.processed ? 'Обработана' : 'Новая', date: x.created_at })),
  ].filter(x => tab === 'all' || x.kind === tab).sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  const loading = site.isLoading || partners.isLoading;
  return <div style={{ padding: 4 }}><Typography.Title level={3}>Заявки</Typography.Title><Typography.Text type="secondary">Партнёры, эксперты, агентства и вакансии</Typography.Text><div style={{ margin: '20px 0' }}><Segmented block value={tab} onChange={v => setTab(String(v))} options={['all', 'partner', 'expert', 'agency', 'vacancy'].map(v => ({ value: v, label: v === 'all' ? 'Все' : labels[v as keyof typeof labels] }))} /></div>{site.isError || partners.isError ? <Alert type="error" message="Не удалось загрузить заявки" /> : null}{loading ? <Spin /> : rows.length === 0 ? <Empty description="Заявок пока нет" /> : rows.map((r, i) => <Card key={`${r.kind}-${r.date}-${i}`} size="small" style={{ marginBottom: 8 }}><Tag>{labels[r.kind as keyof typeof labels] || 'Эксперты'}</Tag> <b>{r.name}</b><div>{r.contact}</div><div>{r.text}</div><small>{r.status} · {new Date(r.date).toLocaleString('ru-RU')}</small></Card>)}</div>;
}
