import React, { useState } from 'react';
import { Alert, Button, Card, DatePicker, Select, Table, Tag, Tooltip, message } from 'antd';
import type { TableColumnsType } from 'antd';
import ruRU from 'antd/es/date-picker/locale/ru_RU';
import { EyeOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs, { type Dayjs } from 'dayjs';
import 'dayjs/locale/ru';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/config/endpoints';
import type { Partner } from '@/features/admin/types';
import { TABLE_CONSTANTS, QUERY_KEYS } from '@/features/admin/constants';
import styles from './PartnersSection.module.css';

interface Manager { id: number; name: string; email: string; is_active: boolean; role: string }
interface ReportPartner extends Partner { total_turnover: number; manager: Manager | null }
interface PartnersSectionProps {
  partners: Partner[];
  loading: boolean;
  onView: (partner: Partner) => void;
}
const money = (amount: number | string) => Number(amount || 0).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' });
const reportKey = ['admin-partners-period'];

export const PartnersSection: React.FC<PartnersSectionProps> = ({ onView }) => {
  const [period, setPeriod] = useState<[Dayjs, Dayjs] | null>(null);
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const start = period?.[0].format('YYYY-MM-DD');
  const end = period?.[1].format('YYYY-MM-DD');
  const report = useQuery({
    queryKey: [...reportKey, start || '', end || ''],
    queryFn: async ({ signal }): Promise<ReportPartner[]> => {
      const response = await apiClient.get(API_ENDPOINTS.admin.finance.partners, {
        params: { start_date: start, end_date: end }, signal,
      });
      if (!Array.isArray(response.data)) throw new Error('Некорректный ответ сервера');
      return response.data;
    },
  });
  const managers = useQuery({
    queryKey: ['admin-partner-managers'],
    queryFn: async ({ signal }): Promise<Manager[]> => {
      const response = await apiClient.get('/users/admin_partner_managers/', { signal });
      if (!Array.isArray(response.data)) throw new Error('Некорректный ответ сервера');
      return response.data;
    },
    staleTime: 60_000,
  });
  const assignment = useMutation({
    mutationFn: ({ partnerId, managerId }: { partnerId: number; managerId: number | null }) =>
      apiClient.patch(API_ENDPOINTS.admin.finance.updatePartner(partnerId), { partner_manager_id: managerId }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: reportKey }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_PARTNERS }),
      ]);
      message.success('Менеджер сохранён');
    },
    onError: () => message.error('Не удалось сохранить менеджера. Обновите список и попробуйте ещё раз.'),
  });
  const rows = report.isError ? [] : report.data || [];
  const totalTurnover = rows.reduce((total, partner) => total + Math.round(Number(partner.total_turnover || 0) * 100), 0) / 100;
  const columns: TableColumnsType<ReportPartner> = [
    { title: 'Партнёр', dataIndex: 'username', key: 'username', width: 210,
      render: (_: string, partner) => <div className={styles.partnerInfo}>
        <div className={styles.partnerName}>{[partner.first_name, partner.last_name].filter(Boolean).join(' ') || partner.username}</div>
        <div className={styles.partnerEmail}>{partner.email}</div>
      </div>,
    },
    { title: 'Менеджер (администратор)', key: 'manager', width: 270,
      render: (_, partner) => {
        const options = (managers.data || []).map(manager => ({ value: manager.id, label: `${manager.name}${manager.email ? ' · ' + manager.email : ''}` }));
        if (partner.manager && !options.some(option => option.value === partner.manager!.id)) {
          options.push({ value: partner.manager.id, label: `${partner.manager.name} (недоступен для назначения)` });
        }
        return <Select<number>
          aria-label={`Менеджер партнёра ${partner.username}`}
          className={styles.managerSelect} placeholder="Не назначен" allowClear showSearch
          optionFilterProp="label" options={options} value={partner.manager?.id}
          loading={managers.isFetching || (assignment.isPending && assignment.variables?.partnerId === partner.id)}
          disabled={managers.isPending || managers.isError || assignment.isPending}
          onChange={value => assignment.mutate({ partnerId: partner.id, managerId: value ?? null })}
        />;
      },
    },
    { title: 'Оборот', dataIndex: 'total_turnover', key: 'total_turnover', width: 160,
      render: amount => <span className={styles.amount}>{money(amount)}</span>,
      sorter: (a, b) => Number(a.total_turnover) - Number(b.total_turnover),
    },
    { title: 'Доходы', dataIndex: 'total_earnings', key: 'total_earnings', width: 150,
      render: amount => <span className={styles.amount}>{money(amount)}</span>,
      sorter: (a, b) => Number(a.total_earnings) - Number(b.total_earnings),
    },
    { title: 'Выплачено', dataIndex: 'paid_earnings', key: 'paid_earnings', width: 150,
      render: amount => money(amount), sorter: (a, b) => Number(a.paid_earnings) - Number(b.paid_earnings),
    },
    { title: 'Реферальный код', dataIndex: 'referral_code', key: 'referral_code', width: 160,
      render: code => <Tag color="purple" className={styles.referralCode}>{code}</Tag>,
    },
    { title: 'Процент', dataIndex: 'partner_commission_rate', key: 'partner_commission_rate', width: 100,
      render: rate => `${rate}%`, sorter: (a, b) => Number(a.partner_commission_rate) - Number(b.partner_commission_rate),
    },
    { title: 'Рефералы (всего)', key: 'referrals', width: 150,
      render: (_, partner) => <div className={styles.referralsInfo}><div>Всего: <strong>{partner.total_referrals}</strong></div><div>Активных: <strong>{partner.active_referrals}</strong></div></div>,
      sorter: (a, b) => a.total_referrals - b.total_referrals,
    },
    { title: 'Статус', dataIndex: 'is_verified', key: 'is_verified', width: 170,
      render: verified => <Tag color={verified ? 'green' : 'orange'}>{verified ? 'Верифицирован' : 'Не верифицирован'}</Tag>,
      filters: [{ text: 'Верифицирован', value: true }, { text: 'Не верифицирован', value: false }],
      onFilter: (value, record) => record.is_verified === value,
    },
    { title: 'Регистрация', dataIndex: 'date_joined', key: 'date_joined', width: 130,
      render: date => dayjs(date).format('DD.MM.YYYY'),
      sorter: (a, b) => dayjs(a.date_joined).unix() - dayjs(b.date_joined).unix(),
    },
    { title: 'Действия', key: 'actions', width: 100,
      render: (_, partner) => <Tooltip title="Подробно"><Button aria-label={`Подробнее о партнёре ${partner.username}`} icon={<EyeOutlined />} onClick={() => onView(partner)} /></Tooltip>,
    },
  ];
  return <div className={styles.partnersContainer}>
    <div className={styles.reportToolbar}>
      <div className={styles.periodControl}>
        <label htmlFor="partner-period-start">Период начислений</label>
        <DatePicker.RangePicker
          id={{ start: 'partner-period-start', end: 'partner-period-end' }} locale={ruRU}
          value={period} format="DD.MM.YYYY" allowClear placeholder={['Начало периода', 'Конец периода']}
          presets={[
            { label: 'Сегодня', value: [dayjs(), dayjs()] },
            { label: 'Последние 7 дней', value: [dayjs().subtract(6, 'day'), dayjs()] },
            { label: 'Этот месяц', value: [dayjs().startOf('month'), dayjs()] },
            { label: 'Прошлый месяц', value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
          ]}
          onChange={dates => { setPeriod(dates?.[0] && dates?.[1] ? [dates[0], dates[1]] : null); setPage(1); }}
        />
        <Button onClick={() => { setPeriod(null); setPage(1); }} disabled={!period}>За всё время</Button>
      </div>
      <div className={styles.turnoverSummary} aria-live="polite">
        <span>Общий оборот всех партнёров</span>
        <strong>{report.isError ? 'Недоступен' : report.isPending || report.isFetching ? 'Загрузка…' : money(totalTurnover)}</strong>
      </div>
    </div>
    <p className={styles.periodNote}>
      {period ? `${period[0].format('DD.MM.YYYY')} по ${period[1].format('DD.MM.YYYY')}, включительно.` : 'За всё время.'}
      {' '}Оборот и доходы по дате начисления, время Москвы. Оборот рассчитан по исходным суммам начислений, как в кабинете директора. Рефералы показаны за всё время.
    </p>
    {report.isError && <Alert type="error" showIcon message="Не удалось загрузить статистику партнёров" action={<Button onClick={() => report.refetch()}>Повторить</Button>} />}
    {managers.isError && <Alert type="warning" showIcon message="Список менеджеров недоступен. Назначение временно отключено." action={<Button onClick={() => managers.refetch()}>Повторить</Button>} />}
    <Card className={styles.partnersCard}>
      <Table<ReportPartner>
        columns={columns} dataSource={rows} rowKey="id" loading={report.isPending || report.isFetching}
        pagination={{ current: page, onChange: setPage, pageSize: undefined, defaultPageSize: TABLE_CONSTANTS.DEFAULT_PAGE_SIZE, showSizeChanger: true, showQuickJumper: true, showTotal: (total, range) => `${range[0]}-${range[1]} из ${total} партнёров` }}
        scroll={{ x: 1800 }} locale={{ emptyText: report.isError ? 'Статистика недоступна' : 'Партнёры не найдены' }} className={styles.partnersTable}
      />
    </Card>
  </div>;
};
