import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Input, Radio, Space, Table, Typography, Tag } from 'antd';
import apiClient from '@/api/client';
import { ROUTES } from '@/utils/constants';
import { useAdminAuth } from '@/features/admin/hooks';

type Review = {id: number; kind: 'expert' | 'client'; author: string; target: string; order_id: number; rating: number; comment: string; created_at: string; is_published: boolean};
export const ReviewsSection: React.FC = () => {
  const [kind, setKind] = useState<'expert' | 'client'>('expert');
  const [search, setSearch] = useState(''); const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Review | null>(null); const [reason, setReason] = useState(''); const [busy, setBusy] = useState(false);
  const queryClient = useQueryClient(); const { message } = App.useApp();
  const query = useQuery({queryKey: ['admin-reviews', kind, search, page], queryFn: async () => (await apiClient.get('/admin-panel/reviews/', {params: {kind, search, page}})).data});
  const remove = async () => {
    if (!selected || reason.trim().length < 3) return;
    setBusy(true);
    try { await apiClient.delete(`/admin-panel/reviews/${selected.kind}/${selected.id}/`, {data: {reason: reason.trim()}});
      setSelected(null); setReason(''); message.success('Отзыв удалён. Действие записано в журнал.');
      await queryClient.invalidateQueries({queryKey: ['admin-reviews']});
    } catch { message.error('Не удалось удалить отзыв. Попробуйте ещё раз.'); } finally { setBusy(false); }
  };
  return <section>
    <Typography.Title level={2}>Отзывы клиентов и экспертов</Typography.Title>
    <Typography.Paragraph>Отзывы клиентов об экспертах и отзывы экспертов о клиентах. Удаление требует причины и записывается в журнал действий.</Typography.Paragraph>
    <Space wrap style={{marginBottom: 24}}>
      <Radio.Group value={kind} onChange={e => {setKind(e.target.value); setPage(1); setSelected(null);}} options={[{label: 'От клиентов', value: 'expert'}, {label: 'От экспертов', value: 'client'}]} optionType="button" />
      <Input.Search aria-label="Поиск отзывов" placeholder="Текст, логин или номер заказа" allowClear onSearch={v => {setSearch(v); setPage(1);}} style={{maxWidth: 360}} />
      <Button onClick={() => query.refetch()}>Обновить</Button>
    </Space>
    {query.isError && <Alert type="error" showIcon message="Не удалось загрузить отзывы" description="Проверьте соединение и нажмите «Обновить»." />}
    {selected && <section aria-label="Подтверждение удаления" style={{padding: 24, marginBottom: 24, background: 'oklch(97% 0.01 300)', borderRadius: 16}}>
      <Typography.Title level={4}>Удалить отзыв к заказу №{selected.order_id}?</Typography.Title>
      <Typography.Paragraph>{selected.author}: {selected.comment || 'Отзыв без текста'} ({selected.rating}/5)</Typography.Paragraph>
      <Typography.Paragraph>Отзыв будет удалён с сайта. Снимок и причина останутся в журнале администратора.</Typography.Paragraph>
      <Input.TextArea aria-label="Причина удаления" placeholder="Причина удаления" value={reason} maxLength={1000} onChange={e => setReason(e.target.value)} rows={2} disabled={busy} />
      <Space style={{marginTop: 16}}><Button danger type="primary" loading={busy} disabled={reason.trim().length < 3} onClick={remove}>Подтвердить удаление</Button><Button disabled={busy} onClick={() => setSelected(null)}>Отмена</Button></Space>
    </section>}
    <Table<Review> rowKey={r => `${r.kind}-${r.id}`} loading={query.isLoading} dataSource={query.data?.results || []} scroll={{x: 850}} locale={{emptyText: 'Отзывы не найдены'}} pagination={{current: page, pageSize: 25, total: query.data?.count || 0, showSizeChanger: false, onChange: setPage}} columns={[
      {title: 'Автор → получатель', key: 'people', render: (_, r) => <>{r.author}<br /><Typography.Text type="secondary">→ {r.target}</Typography.Text></>},
      {title: 'Заказ', dataIndex: 'order_id', width: 90}, {title: 'Оценка', dataIndex: 'rating', width: 85, render: v => `${v}/5`},
      {title: 'Отзыв', key: 'comment', render: (_, r) => <div style={{maxWidth: 540, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere'}}>{r.comment || 'Без текста'}{!r.is_published && <Tag>Снят с публикации</Tag>}</div>},
      {title: 'Дата', dataIndex: 'created_at', width: 115, render: v => new Date(v).toLocaleDateString('ru-RU')},
      {title: '', key: 'actions', width: 110, render: (_, r) => <Button danger disabled={busy} onClick={() => {setSelected(r); setReason(''); window.scrollTo({top: 0, behavior: 'smooth'});}}>Удалить</Button>}
    ]} />
  </section>;
};
export default function ReviewsPage() {
  const {user, loading} = useAdminAuth();
  if (loading) return <p role="status">Загружаем кабинет…</p>;
  if (!user || !['admin', 'director'].includes(user.role)) return <Alert type="error" message="Доступ только для администрации" />;
  return <main style={{maxWidth: 1400, margin: '0 auto', padding: '32px 20px'}}><Link to={user.role === 'director' ? ROUTES.admin.directorDashboard : ROUTES.admin.dashboard}>← В кабинет</Link><ReviewsSection /></main>;
}
