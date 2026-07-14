import React from 'react';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  FileDoneOutlined,
  FlagOutlined,
  FormOutlined,
  SendOutlined,
  TeamOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import type { OrderAvailableActions } from '@/features/orders/types/orders';
import styles from './OrderTimeline.module.css';

type TimelineOrder = {
  id?: number;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  expert?: unknown;
  expert_id?: number | null;
  available_actions?: OrderAvailableActions;
  files?: Array<{ file_type?: string | null; description?: string | null; created_at?: string | null }>;
} & Record<string, unknown>;

interface OrderTimelineProps {
  order: TimelineOrder;
  compact?: boolean;
  className?: string;
  onReviewClick?: () => void;
}

const statusRank: Record<string, number> = {
  new: 0,
  awaiting_expert_acceptance: 1,
  waiting_payment: 2,
  in_progress: 3,
  review: 5,
  revision: 6,
  completed: 7,
  cancelled: -1,
  canceled: -1,
};

const formatDate = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
};

const hasDeliveredWork = (order: TimelineOrder) => {
  const files = Array.isArray(order.files) ? order.files : [];
  return files.some((file) => {
    const type = String(file?.file_type || '').toLowerCase();
    const description = String(file?.description || '').toLowerCase();
    return type === 'solution' || type === 'revision' || description.includes('chat_delivery');
  });
};

const isPaid = (order: TimelineOrder) => {
  const rawPayment = String(order.payment_status ?? order.pay_status ?? '').toLowerCase();
  if (['paid', 'completed', 'success', 'succeeded'].includes(rawPayment)) return true;
  return statusRank[String(order.status || '')] >= statusRank.in_progress;
};

const getNextStep = (order: TimelineOrder) => {
  const actions = order.available_actions || {};
  const status = String(order.status || '');

  if (actions.can_accept_assignment) return 'Примите заказ или отклоните назначение';
  if (actions.can_accept_bid) return 'Выберите эксперта, чтобы запустить работу';
  if (status === 'waiting_payment') return 'Оплатите заказ, чтобы эксперт начал работу';
  if (actions.can_upload_work) return 'Загрузите готовую работу в заказ';
  if (actions.can_approve_work || actions.can_request_revision) return 'Проверьте работу и примите решение';
  if (actions.can_create_review) return 'Оставьте отзыв о работе';
  if (status === 'revision') return 'Дождитесь исправленной версии работы';
  if (status === 'completed') return 'Заказ завершён';
  if (status === 'cancelled' || status === 'canceled') return 'Заказ отменён';
  if (order.expert || order.expert_id) return 'Дождитесь начала работы эксперта';
  return 'Ожидайте откликов или выберите эксперта';
};

const OrderTimeline: React.FC<OrderTimelineProps> = ({ order, compact = false, className, onReviewClick }) => {
  const status = String(order.status || 'new');
  const rank = statusRank[status] ?? 0;
  const actions = order.available_actions || {};
  const nextStep = getNextStep(order);
  const canOpenReview = Boolean(actions.can_create_review && onReviewClick);
  const delivered = hasDeliveredWork(order);
  const expertSelected = Boolean(order.expert || order.expert_id || rank >= 1);
  const accepted = rank >= 2;
  const paid = isPaid(order);
  const inReview = rank >= 5 || delivered;
  const revision = status === 'revision';
  const completed = status === 'completed';

  const dates = {
    created: formatDate(order.created_at),
    updated: formatDate(order.updated_at),
  };

  const steps = [
    { label: 'Создан', meta: dates.created || 'старт', done: true, active: rank === 0, icon: <FlagOutlined /> },
    { label: 'Эксперт выбран', meta: expertSelected ? dates.updated : 'следующий шаг', done: expertSelected, active: rank === 1, icon: <TeamOutlined /> },
    { label: 'Принят', meta: accepted ? dates.updated : 'ожидает решения', done: accepted, active: rank === 2, icon: <CheckCircleOutlined /> },
    { label: 'Оплачен', meta: paid ? dates.updated : 'ожидает оплаты', done: paid, active: status === 'waiting_payment', icon: <DollarOutlined /> },
    { label: 'Работа загружена', meta: delivered ? dates.updated : 'ожидает файл', done: delivered, active: rank === 3, icon: <SendOutlined /> },
    { label: 'Проверка', meta: inReview ? 'проверьте результат' : 'после загрузки', done: inReview, active: status === 'review', icon: <FileDoneOutlined /> },
    { label: 'Доработка', meta: revision ? 'нужны правки' : 'если потребуется', done: revision, active: revision, icon: <ToolOutlined /> },
    { label: 'Завершён', meta: completed ? dates.updated : 'финал', done: completed, active: completed, icon: <FormOutlined /> },
  ];

  return (
    <section className={`${styles.timelineCard} ${compact ? styles.compact : ''} ${className || ''}`}>
      <div className={styles.header}>
        <div>
          <div className={styles.title}>Таймлайн заказа</div>
          <div className={styles.subtitle}>Видно, что уже произошло и какой следующий шаг.</div>
        </div>
        <button
          type="button"
          className={`${styles.nextStep} ${canOpenReview ? styles.nextStepButton : ''}`}
          onClick={canOpenReview ? onReviewClick : undefined}
          disabled={!canOpenReview}
        >
          <ClockCircleOutlined className={styles.nextStepIcon} />
          {nextStep}
        </button>
      </div>
      <div className={styles.steps}>
        {steps.map((step) => (
          <div
            key={step.label}
            className={`${styles.step} ${step.done ? styles.stepDone : ''} ${step.active ? styles.stepActive : ''}`}
          >
            <div className={styles.stepIcon}>{step.icon}</div>
            <div className={styles.stepLabel}>{step.label}</div>
            <div className={styles.stepMeta}>{step.meta}</div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default OrderTimeline;
