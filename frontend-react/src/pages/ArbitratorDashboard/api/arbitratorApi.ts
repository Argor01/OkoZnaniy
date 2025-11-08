import { apiClient } from '../../../api/client';
import type {
  Claim,
  RefundRequest,
  Dispute,
  Decision,
  InternalMessage,
  DecisionRequest,
  RequestInfoRequest,
  SendForApprovalRequest,
  SendMessageRequest,
  GetClaimsParams,
  GetMessagesParams,
  GetStatisticsParams,
  PaginatedResponse,
  Statistics,
} from './types';

// Генерация тестовых данных

// Хранилище для отслеживания взятых в работу обращений
const getTakenClaimsIds = (): Set<number> => {
  try {
    const stored = localStorage.getItem('arbitrator_taken_claims');
    if (stored) {
      const ids = JSON.parse(stored) as number[];
      return new Set(ids);
    }
  } catch (e) {
    console.warn('Error reading taken claims from localStorage:', e);
  }
  return new Set<number>();
};

const saveTakenClaimId = (id: number): void => {
  try {
    const takenIds = getTakenClaimsIds();
    takenIds.add(id);
    localStorage.setItem('arbitrator_taken_claims', JSON.stringify(Array.from(takenIds)));
  } catch (e) {
    console.warn('Error saving taken claim to localStorage:', e);
  }
};

// Хранилище для отслеживания обращений, отправленных на согласование
const getPendingApprovalClaimsIds = (): Set<number> => {
  try {
    const stored = localStorage.getItem('arbitrator_pending_approval_claims');
    if (stored) {
      const ids = JSON.parse(stored) as number[];
      return new Set(ids);
    }
  } catch (e) {
    console.warn('Error reading pending approval claims from localStorage:', e);
  }
  return new Set<number>();
};

const savePendingApprovalClaimId = (id: number): void => {
  try {
    const pendingIds = getPendingApprovalClaimsIds();
    pendingIds.add(id);
    localStorage.setItem('arbitrator_pending_approval_claims', JSON.stringify(Array.from(pendingIds)));
  } catch (e) {
    console.warn('Error saving pending approval claim to localStorage:', e);
  }
};

// Хранилище для решений
const getDecisions = (): Map<number, Decision> => {
  try {
    const stored = localStorage.getItem('arbitrator_decisions');
    if (stored) {
      const decisions = JSON.parse(stored) as Array<[number, Decision]>;
      return new Map(decisions);
    }
  } catch (e) {
    console.warn('Error reading decisions from localStorage:', e);
  }
  return new Map<number, Decision>();
};

const saveDecision = (claimId: number, decision: Decision): void => {
  try {
    const decisions = getDecisions();
    decisions.set(claimId, decision);
    localStorage.setItem('arbitrator_decisions', JSON.stringify(Array.from(decisions.entries())));
  } catch (e) {
    console.warn('Error saving decision to localStorage:', e);
  }
};

// Хранилище для сообщений
const getSavedMessages = (): InternalMessage[] => {
  try {
    const stored = localStorage.getItem('arbitrator_messages');
    if (stored) {
      return JSON.parse(stored) as InternalMessage[];
    }
  } catch (e) {
    console.warn('Error reading messages from localStorage:', e);
  }
  return [];
};

const saveMessage = (message: InternalMessage): void => {
  try {
    const messages = getSavedMessages();
    messages.push(message);
    localStorage.setItem('arbitrator_messages', JSON.stringify(messages));
  } catch (e) {
    console.warn('Error saving message to localStorage:', e);
  }
};

/**
 * Генерация тестовых претензий
 */
const generateMockClaims = (): Claim[] => {
  const now = new Date();
  const claims: Claim[] = [];
  const takenClaimsIds = getTakenClaimsIds();
  const pendingApprovalClaimsIds = getPendingApprovalClaimsIds();
  const decisions = getDecisions();
  
  // Новые обращения
  claims.push(
      {
        id: 1001,
        type: 'refund',
        status: (() => {
          const decision = decisions.get(1001);
          if (decision) {
            if (decision.requires_approval && decision.approval_status === 'pending') {
              return 'pending_approval';
            }
            if (!decision.requires_approval || decision.approval_status === 'approved') {
              return 'completed';
            }
          }
          if (pendingApprovalClaimsIds.has(1001)) return 'pending_approval';
          if (takenClaimsIds.has(1001)) return 'in_progress';
          return 'new';
        })(),
        priority: 'high',
        order: {
          id: 501,
          title: 'Дипломная работа по экономике',
          description: 'Требуется написание дипломной работы по теме "Современные тенденции развития малого бизнеса"',
          amount: 15000,
          created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          deadline: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'cancelled',
        },
        client: {
          id: 201,
          username: 'Иван Петров',
          email: 'ivan.petrov@example.com',
          phone: '+7 (999) 123-45-67',
        },
        expert: {
          id: 301,
          username: 'Мария Смирнова',
          email: 'maria.smirnova@example.com',
          rating: 4.8,
        },
        created_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        updated_at: (pendingApprovalClaimsIds.has(1001) || takenClaimsIds.has(1001)) ? new Date().toISOString() : new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        taken_at: (pendingApprovalClaimsIds.has(1001) || takenClaimsIds.has(1001)) ? new Date().toISOString() : undefined,
        decision: decisions.get(1001) || (pendingApprovalClaimsIds.has(1001) ? {
          id: 1,
          claim_id: 1001,
          decision_type: 'full_refund',
          reasoning: 'Решение требует согласования дирекции',
          created_at: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
          arbitrator: {
            id: 1,
            username: 'Арбитр Системный',
          },
          requires_approval: true,
          approval_status: 'pending',
          approval_comment: 'Отправлено на согласование дирекции',
        } : undefined),
        messages: [
          {
            id: 1,
            sender: { id: 201, username: 'Иван Петров', role: 'client' },
            text: 'Работа не соответствует требованиям, прошу вернуть средства',
            created_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
          },
        ],
        attachments: [],
      },
      {
        id: 1002,
        type: 'dispute',
        status: pendingApprovalClaimsIds.has(1002) ? 'pending_approval' : (takenClaimsIds.has(1002) ? 'in_progress' : 'new'),
        priority: 'medium',
        order: {
          id: 502,
          title: 'Курсовая работа по программированию',
          description: 'Разработка веб-приложения на React',
          amount: 8000,
          created_at: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          deadline: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'cancelled',
        },
        client: {
          id: 202,
          username: 'Анна Козлова',
          email: 'anna.kozlova@example.com',
          phone: '+7 (999) 234-56-78',
        },
        expert: {
          id: 302,
          username: 'Дмитрий Волков',
          email: 'dmitry.volkov@example.com',
          rating: 4.5,
        },
        created_at: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
        updated_at: takenClaimsIds.has(1002) ? new Date().toISOString() : new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
        taken_at: takenClaimsIds.has(1002) ? new Date().toISOString() : undefined,
        messages: [],
        attachments: [],
      },
      {
        id: 1003,
        type: 'conflict',
        status: pendingApprovalClaimsIds.has(1003) ? 'pending_approval' : (takenClaimsIds.has(1003) ? 'in_progress' : 'new'),
        priority: 'high',
        order: {
          id: 503,
          title: 'Эссе по литературе',
          description: 'Анализ произведений Достоевского',
          amount: 5000,
          created_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          deadline: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'cancelled',
        },
        client: {
          id: 203,
          username: 'Сергей Иванов',
          email: 'sergey.ivanov@example.com',
        },
        expert: {
          id: 303,
          username: 'Елена Новикова',
          email: 'elena.novikova@example.com',
          rating: 4.2,
        },
        created_at: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
        updated_at: takenClaimsIds.has(1003) ? new Date().toISOString() : new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
        taken_at: takenClaimsIds.has(1003) ? new Date().toISOString() : undefined,
        messages: [],
        attachments: [],
      },
      {
        id: 1004,
        type: 'refund',
        status: pendingApprovalClaimsIds.has(1004) ? 'pending_approval' : (takenClaimsIds.has(1004) ? 'in_progress' : 'new'),
        priority: 'low',
        order: {
          id: 504,
          title: 'Реферат по истории',
          description: 'История России в 19 веке',
          amount: 3000,
          created_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          deadline: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'cancelled',
        },
        client: {
          id: 204,
          username: 'Ольга Соколова',
          email: 'olga.sokolova@example.com',
        },
        expert: {
          id: 304,
          username: 'Александр Лебедев',
          email: 'alex.lebedev@example.com',
          rating: 4.9,
        },
        created_at: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
        updated_at: takenClaimsIds.has(1004) ? new Date().toISOString() : new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
        taken_at: takenClaimsIds.has(1004) ? new Date().toISOString() : undefined,
        messages: [],
        attachments: [],
      },
    );

  // В работе
  claims.push(
      {
        id: 2001,
        type: 'refund',
        status: (() => {
          const decision = decisions.get(2001);
          if (decision) {
            if (decision.requires_approval && decision.approval_status === 'pending') {
              return 'pending_approval';
            }
            if (!decision.requires_approval || decision.approval_status === 'approved') {
              return 'completed';
            }
          }
          if (pendingApprovalClaimsIds.has(2001)) return 'pending_approval';
          return 'in_progress';
        })(),
        priority: 'high',
        order: {
          id: 601,
          title: 'Дипломная работа по праву',
          description: 'Анализ судебной практики по гражданским делам',
          amount: 20000,
          created_at: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          deadline: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'cancelled',
        },
        client: {
          id: 205,
          username: 'Владимир Морозов',
          email: 'vladimir.morozov@example.com',
        },
        expert: {
          id: 305,
          username: 'Татьяна Федорова',
          email: 'tatyana.fedorova@example.com',
          rating: 4.7,
        },
        created_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        taken_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        arbitrator: {
          id: 1,
          username: 'Арбитр Системный',
        },
        decision: pendingApprovalClaimsIds.has(2001) ? {
          id: 1,
          claim_id: 2001,
          decision_type: 'full_refund',
          reasoning: 'Решение требует согласования дирекции',
          created_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          arbitrator: {
            id: 1,
            username: 'Арбитр Системный',
          },
          requires_approval: true,
          approval_status: 'pending',
          approval_comment: 'Отправлено на согласование дирекции',
        } : undefined,
        messages: [
          {
            id: 2,
            sender: { id: 205, username: 'Владимир Морозов', role: 'client' },
            text: 'Работа выполнена некачественно, требуется возврат полной суммы',
            created_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 3,
            sender: { id: 305, username: 'Татьяна Федорова', role: 'expert' },
            text: 'Работа выполнена согласно техническому заданию, клиент не предоставил замечания в срок',
            created_at: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ],
        attachments: [],
      },
      {
        id: 2002,
        type: 'dispute',
        status: (() => {
          const decision = decisions.get(2002);
          if (decision) {
            if (decision.requires_approval && decision.approval_status === 'pending') {
              return 'pending_approval';
            }
            if (!decision.requires_approval || decision.approval_status === 'approved') {
              return 'completed';
            }
          }
          if (pendingApprovalClaimsIds.has(2002)) return 'pending_approval';
          return 'in_progress';
        })(),
        priority: 'medium',
        order: {
          id: 602,
          title: 'Контрольная работа по математике',
          description: 'Решение задач по линейной алгебре',
          amount: 4000,
          created_at: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000).toISOString(),
          deadline: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'cancelled',
        },
        client: {
          id: 206,
          username: 'Екатерина Мишина',
          email: 'ekaterina.mishina@example.com',
        },
        expert: {
          id: 306,
          username: 'Павел Орлов',
          email: 'pavel.orlov@example.com',
          rating: 4.6,
        },
        created_at: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        taken_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        arbitrator: {
          id: 1,
          username: 'Арбитр Системный',
        },
        decision: decisions.get(2002) || (pendingApprovalClaimsIds.has(2002) ? {
          id: 2,
          claim_id: 2002,
          decision_type: 'partial_refund',
          reasoning: 'Решение требует согласования дирекции',
          created_at: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(),
          arbitrator: {
            id: 1,
            username: 'Арбитр Системный',
          },
          requires_approval: true,
          approval_status: 'pending',
          approval_comment: 'Отправлено на согласование дирекции',
        } : undefined),
        messages: [],
        attachments: [],
      },
    );

  // Завершённые
  claims.push(
      {
        id: 3001,
        type: 'refund',
        status: 'completed',
        priority: 'high',
        order: {
          id: 701,
          title: 'Курсовая работа по психологии',
          description: 'Исследование влияния стресса на работоспособность',
          amount: 12000,
          created_at: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          deadline: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'cancelled',
        },
        client: {
          id: 207,
          username: 'Наталья Романова',
          email: 'natalya.romanova@example.com',
        },
        expert: {
          id: 307,
          username: 'Игорь Степанов',
          email: 'igor.stepanov@example.com',
          rating: 4.4,
        },
        created_at: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        taken_at: new Date(now.getTime() - 24 * 24 * 60 * 60 * 1000).toISOString(),
        completed_at: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        arbitrator: {
          id: 1,
          username: 'Арбитр Системный',
        },
        decision: {
          id: 1,
          claim_id: 3001,
          decision_type: 'full_refund',
          refund_amount: 12000,
          reasoning: 'Работа не соответствует требованиям ТЗ, клиент предоставил все необходимые доказательства',
          client_comment: 'Средства будут возвращены в течение 5 рабочих дней',
          expert_comment: 'Рекомендуется более внимательно изучать требования перед началом работы',
          created_at: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString(),
          arbitrator: { id: 1, username: 'Арбитр Системный' },
          requires_approval: false,
        },
        messages: [],
        attachments: [],
      },
      {
        id: 3002,
        type: 'dispute',
        status: 'completed',
        priority: 'medium',
        order: {
          id: 702,
          title: 'Эссе по философии',
          description: 'Анализ философских взглядов Канта',
          amount: 6000,
          created_at: new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000).toISOString(),
          deadline: new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'cancelled',
        },
        client: {
          id: 208,
          username: 'Алексей Петров',
          email: 'alexey.petrov@example.com',
        },
        expert: {
          id: 308,
          username: 'Мария Кузнецова',
          email: 'maria.kuznetsova@example.com',
          rating: 4.8,
        },
        created_at: new Date(now.getTime() - 23 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(now.getTime() - 18 * 24 * 60 * 60 * 1000).toISOString(),
        taken_at: new Date(now.getTime() - 22 * 24 * 60 * 60 * 1000).toISOString(),
        completed_at: new Date(now.getTime() - 18 * 24 * 60 * 60 * 1000).toISOString(),
        arbitrator: {
          id: 1,
          username: 'Арбитр Системный',
        },
        decision: {
          id: 2,
          claim_id: 3002,
          decision_type: 'partial_refund',
          refund_amount: 3000,
          reasoning: 'Работа выполнена частично, но имеет существенные недочёты',
          client_comment: 'Возвращено 50% суммы',
          expert_comment: 'Необходимо доработать материал согласно замечаниям',
          created_at: new Date(now.getTime() - 18 * 24 * 60 * 60 * 1000).toISOString(),
          arbitrator: { id: 1, username: 'Арбитр Системный' },
          requires_approval: false,
        },
        messages: [],
        attachments: [],
      },
      {
        id: 3003,
        type: 'conflict',
        status: 'completed',
        priority: 'high',
        order: {
          id: 703,
          title: 'Дипломная работа по маркетингу',
          description: 'Маркетинговая стратегия для нового продукта',
          amount: 18000,
          created_at: new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000).toISOString(),
          deadline: new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'cancelled',
        },
        client: {
          id: 209,
          username: 'Дмитрий Соколов',
          email: 'dmitry.sokolov@example.com',
        },
        expert: {
          id: 309,
          username: 'Анна Морозова',
          email: 'anna.morozova@example.com',
          rating: 4.9,
        },
        created_at: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(now.getTime() - 22 * 24 * 60 * 60 * 1000).toISOString(),
        taken_at: new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000).toISOString(),
        completed_at: new Date(now.getTime() - 22 * 24 * 60 * 60 * 1000).toISOString(),
        arbitrator: {
          id: 1,
          username: 'Арбитр Системный',
        },
        decision: {
          id: 3,
          claim_id: 3003,
          decision_type: 'no_refund',
          reasoning: 'Работа выполнена согласно требованиям, претензии клиента необоснованны',
          client_comment: 'Претензия отклонена',
          expert_comment: 'Работа выполнена в полном соответствии с ТЗ',
          created_at: new Date(now.getTime() - 22 * 24 * 60 * 60 * 1000).toISOString(),
          arbitrator: { id: 1, username: 'Арбитр Системный' },
          requires_approval: false,
        },
        messages: [],
        attachments: [],
      },
      {
        id: 3004,
        type: 'refund',
        status: 'completed',
        priority: 'medium',
        order: {
          id: 704,
          title: 'Реферат по биологии',
          description: 'Эволюция живых организмов',
          amount: 3500,
          created_at: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000).toISOString(),
          deadline: new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'cancelled',
        },
        client: {
          id: 210,
          username: 'Юлия Волкова',
          email: 'yulia.volkova@example.com',
        },
        expert: {
          id: 310,
          username: 'Роман Новиков',
          email: 'roman.novikov@example.com',
          rating: 4.3,
        },
        created_at: new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000).toISOString(),
        taken_at: new Date(now.getTime() - 34 * 24 * 60 * 60 * 1000).toISOString(),
        completed_at: new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000).toISOString(),
        arbitrator: {
          id: 1,
          username: 'Арбитр Системный',
        },
        decision: {
          id: 4,
          claim_id: 3004,
          decision_type: 'revision',
          reasoning: 'Требуется доработка работы согласно замечаниям клиента',
          client_comment: 'Работа будет доработана экспертом',
          expert_comment: 'Необходимо внести исправления в течение 3 дней',
          created_at: new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000).toISOString(),
          arbitrator: { id: 1, username: 'Арбитр Системный' },
          requires_approval: false,
        },
        messages: [],
        attachments: [],
      },
    );

  // Ожидают решения
  claims.push(
      {
        id: 4001,
        type: 'refund',
        status: 'pending_approval',
        priority: 'high',
        order: {
          id: 801,
          title: 'Дипломная работа по медицине',
          description: 'Исследование новых методов лечения',
          amount: 25000,
          created_at: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString(),
          deadline: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'cancelled',
        },
        client: {
          id: 211,
          username: 'Андрей Федоров',
          email: 'andrey.fedorov@example.com',
        },
        expert: {
          id: 311,
          username: 'Светлана Лебедева',
          email: 'svetlana.lebedeva@example.com',
          rating: 5.0,
        },
        created_at: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        taken_at: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        arbitrator: {
          id: 1,
          username: 'Арбитр Системный',
        },
        decision: {
          id: 5,
          claim_id: 4001,
          decision_type: 'full_refund',
          refund_amount: 25000,
          reasoning: 'Сложный случай, требуется согласование с дирекцией из-за большой суммы',
          created_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          arbitrator: { id: 1, username: 'Арбитр Системный' },
          requires_approval: true,
          approval_status: 'pending',
          approval_comment: 'Ожидается решение дирекции',
        },
        messages: [],
        attachments: [],
      },
      {
        id: 4002,
        type: 'conflict',
        status: 'pending_approval',
        priority: 'high',
        order: {
          id: 802,
          title: 'Курсовая работа по физике',
          description: 'Квантовая механика и её применение',
          amount: 10000,
          created_at: new Date(now.getTime() - 18 * 24 * 60 * 60 * 1000).toISOString(),
          deadline: new Date(now.getTime() + 18 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'cancelled',
        },
        client: {
          id: 212,
          username: 'Ирина Ковалева',
          email: 'irina.kovaleva@example.com',
        },
        expert: {
          id: 312,
          username: 'Максим Семенов',
          email: 'maxim.semenov@example.com',
          rating: 4.7,
        },
        created_at: new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        taken_at: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000).toISOString(),
        arbitrator: {
          id: 1,
          username: 'Арбитр Системный',
        },
        decision: {
          id: 6,
          claim_id: 4002,
          decision_type: 'partial_refund',
          refund_amount: 5000,
          reasoning: 'Требуется согласование частичного возврата',
          created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          arbitrator: { id: 1, username: 'Арбитр Системный' },
          requires_approval: true,
          approval_status: 'pending',
          approval_comment: 'На рассмотрении',
        },
        messages: [],
        attachments: [],
      },
    );

  return claims;
};

/**
 * Генерация тестовых сообщений
 */
const generateMockMessages = (params?: GetMessagesParams): InternalMessage[] => {
  const now = new Date();
  const savedMessages = getSavedMessages();
  const messages: InternalMessage[] = [
    {
      id: 1,
      sender: {
        id: 1,
        username: 'Арбитр Системный',
        role: 'arbitrator',
      },
      recipient: {
        id: 2,
        username: 'Директор',
        role: 'director',
      },
      text: 'Добрый день! Требуется согласование решения по обращению #4001. Сумма возврата составляет 25000 рублей. Клиент предоставил все необходимые документы, подтверждающие несоответствие работы требованиям.',
      claim_id: 4001,
      priority: 'high',
      attachments: [],
      created_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'read',
      read_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 2,
      sender: {
        id: 2,
        username: 'Директор',
        role: 'director',
      },
      recipient: {
        id: 1,
        username: 'Арбитр Системный',
        role: 'arbitrator',
      },
      text: 'Здравствуйте! Изучил материалы по обращению #4001. Необходимо уточнить детали у эксперта по поводу сроков выполнения работы. Можете запросить дополнительную информацию?',
      claim_id: 4001,
      priority: 'high',
      attachments: [],
      created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'replied',
      read_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 3,
      sender: {
        id: 1,
        username: 'Арбитр Системный',
        role: 'arbitrator',
      },
      recipient: {
        id: 2,
        username: 'Директор',
        role: 'director',
      },
      text: 'Конечно, запрошу дополнительную информацию у эксперта и клиента. Сообщу результаты в течение дня.',
      claim_id: 4001,
      priority: 'medium',
      attachments: [],
      created_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'sent',
    },
    {
      id: 4,
      sender: {
        id: 1,
        username: 'Арбитр Системный',
        role: 'arbitrator',
      },
      recipient: {
        id: 2,
        username: 'Директор',
        role: 'director',
      },
      text: 'По обращению #4002 требуется ваше мнение по поводу частичного возврата средств. Клиент настаивает на полном возврате, но эксперт выполнил часть работы качественно.',
      claim_id: 4002,
      priority: 'medium',
      attachments: [],
      created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'read',
      read_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 5,
      sender: {
        id: 2,
        username: 'Директор',
        role: 'director',
      },
      recipient: {
        id: 1,
        username: 'Арбитр Системный',
        role: 'arbitrator',
      },
      text: 'Согласен с решением о частичном возврате. Эксперт выполнил часть работы, поэтому частичный возврат справедлив. Можно утверждать решение.',
      claim_id: 4002,
      priority: 'medium',
      attachments: [],
      created_at: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(),
      status: 'replied',
      read_at: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(),
    },
  ];

  // Фильтрация по обращению
  let filteredMessages = messages;
  if (params?.claim_id) {
    filteredMessages = filteredMessages.filter((m) => m.claim_id === params.claim_id);
  }

  // Фильтрация непрочитанных
  if (params?.unread_only) {
    filteredMessages = filteredMessages.filter((m) => !m.read_at);
  }

  // Добавляем сохраненные сообщения
  if (savedMessages.length > 0) {
    // Фильтруем сохраненные сообщения по параметрам
    let savedFiltered = savedMessages;
    if (params?.claim_id) {
      savedFiltered = savedFiltered.filter((m) => m.claim_id === params.claim_id);
    }
    if (params?.unread_only) {
      savedFiltered = savedFiltered.filter((m) => !m.read_at);
    }
    // Добавляем сохраненные сообщения в начало списка
    filteredMessages = [...savedFiltered, ...filteredMessages];
    // Сортируем по дате создания (новые первыми)
    filteredMessages.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  return filteredMessages;
};

/**
 * Генерация тестовой статистики
 */
const generateMockStatistics = (): Statistics => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  return {
    total_claims: 25,
    claims_by_status: {
      new: 4,
      in_progress: 2,
      completed: 17,
      pending_approval: 2,
    },
    average_processing_time: 4.5, // дней
    decisions_by_type: {
      full_refund: 8,
      partial_refund: 5,
      no_refund: 2,
      revision: 2,
      other: 0,
    },
    period: {
      start: startOfMonth.toISOString(),
      end: now.toISOString(),
    },
  };
};

// Претензии и обращения

/**
 * Получение списка претензий/обращений
 */
export const getClaims = async (params?: GetClaimsParams): Promise<PaginatedResponse<Claim>> => {
  // Используем тестовые данные, если API недоступен (для разработки)
  const USE_MOCK_DATA = true; // Установите в false, когда API будет готов
  
  // Генерируем тестовые данные (используется всегда, если USE_MOCK_DATA = true, или как fallback при ошибке API)
  const generateMockResponse = (): PaginatedResponse<Claim> => {
    const allMockClaims = generateMockClaims();
    
    // Применяем фильтры
    let filteredClaims = allMockClaims;
    
    // Фильтр по статусу
    if (params?.status) {
      filteredClaims = filteredClaims.filter((c) => c.status === params.status);
    }
    
    // Фильтрация по типу
    if (params?.type) {
      filteredClaims = filteredClaims.filter((c) => c.type === params.type);
    }

    // Фильтрация по поиску
    if (params?.search) {
      const searchLower = params.search.toLowerCase();
      filteredClaims = filteredClaims.filter(
        (c) =>
          c.id.toString().includes(searchLower) ||
          c.client.username.toLowerCase().includes(searchLower) ||
          c.client.email.toLowerCase().includes(searchLower) ||
          (c.expert?.username.toLowerCase().includes(searchLower) || false) ||
          (c.expert?.email.toLowerCase().includes(searchLower) || false) ||
          c.order.title.toLowerCase().includes(searchLower)
      );
    }

    // Фильтрация по датам
    if (params?.date_from) {
      const dateFrom = new Date(params.date_from);
      filteredClaims = filteredClaims.filter((c) => new Date(c.created_at) >= dateFrom);
    }
    if (params?.date_to) {
      const dateTo = new Date(params.date_to);
      dateTo.setHours(23, 59, 59, 999);
      filteredClaims = filteredClaims.filter((c) => new Date(c.created_at) <= dateTo);
    }
    
    const totalCount = filteredClaims.length;
    
    // Пагинация
    const page = params?.page || 1;
    const pageSize = params?.page_size || 10;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedClaims = filteredClaims.slice(startIndex, endIndex);
    
    return {
      count: totalCount,
      next: endIndex < totalCount ? 'next' : null,
      previous: page > 1 ? 'previous' : null,
      results: paginatedClaims,
    };
  };
  
  // Если используем моковые данные, просто возвращаем их
  if (USE_MOCK_DATA) {
    const result = generateMockResponse();
    console.log('Using mock data (USE_MOCK_DATA=true):', { params, totalCount: result.count, resultsCount: result.results.length });
    return result;
  }
  
  // Иначе пытаемся получить данные из API
  try {
    const response = await apiClient.get('/arbitrator/claims/', { params });
    return response.data;
  } catch (error: any) {
    // Если ошибка 404 или API недоступен, используем тестовые данные
    if (error?.response?.status === 404 || error?.code === 'ERR_NETWORK') {
      console.warn('API endpoint not found, using mock data:', error?.response?.status || error?.code);
    } else {
      console.error('Error fetching claims:', error);
    }
    
    const result = generateMockResponse();
    console.log('Returning mock data (API error):', { params, totalCount: result.count, resultsCount: result.results.length });
    return result;
  }
};

/**
 * Получение детальной информации о претензии/обращении
 */
export const getClaim = async (id: number): Promise<Claim> => {
  try {
    const response = await apiClient.get(`/arbitrator/claims/${id}/`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching claim ${id}:`, error);
    // Возвращаем тестовые данные для наглядности
    const allClaims = generateMockClaims();
    const claim = allClaims.find((c) => c.id === id);
    if (claim) {
      return claim;
    }
    throw new Error(`Claim ${id} not found`);
  }
};

/**
 * Взять претензию/обращение в работу
 */
export const takeClaim = async (id: number): Promise<Claim> => {
  const USE_MOCK_DATA = true; // Установите в false, когда API будет готов

  // Mock-реализация
  const mockTakeClaim = (): Claim => {
    // Сохраняем ID в localStorage перед генерацией данных
    saveTakenClaimId(id);
    
    // Генерируем данные после сохранения - теперь статус будет правильным
    const allMockClaims = generateMockClaims();
    const claim = allMockClaims.find((c) => c.id === id);
    if (claim) {
      // Убеждаемся, что статус правильный
      const updatedClaim: Claim = {
        ...claim,
        status: 'in_progress',
        taken_at: claim.taken_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      console.log('Using mock data for takeClaim:', { id, updatedClaim });
      return updatedClaim;
    }
    throw new Error(`Claim ${id} not found`);
  };

  if (USE_MOCK_DATA) {
    return mockTakeClaim();
  }

  try {
    const response = await apiClient.post(`/arbitrator/claims/${id}/take/`);
    return response.data;
  } catch (error: any) {
    if (error?.response?.status === 404 || error?.code === 'ERR_NETWORK') {
      console.warn('API endpoint not found, using mock data:', error?.response?.status || error?.code);
      return mockTakeClaim();
    }
    console.error(`Error taking claim ${id}:`, error);
    throw error;
  }
};

/**
 * Принять решение по претензии/обращению
 */
export const makeDecision = async (id: number, data: DecisionRequest): Promise<Decision> => {
  const USE_MOCK_DATA = true; // Установите в false, когда API будет готов

  // Mock-реализация
  const mockMakeDecision = (): Decision => {
    const decision: Decision = {
      id: Date.now(), // Простой ID на основе времени
      claim_id: id,
      decision_type: data.decision_type,
      reasoning: data.reasoning,
      client_comment: data.client_comment,
      expert_comment: data.expert_comment,
      refund_amount: data.refund_amount,
      created_at: new Date().toISOString(),
      arbitrator: {
        id: 1,
        username: 'Арбитр Системный',
      },
      requires_approval: data.require_approval,
      approval_status: data.require_approval ? 'pending' : undefined,
      approval_comment: data.require_approval ? 'Ожидает согласования дирекции' : undefined,
    };

    // Сохраняем решение в localStorage
    saveDecision(id, decision);

    // Если требуется согласование, добавляем в список ожидающих согласования
    if (data.require_approval) {
      savePendingApprovalClaimId(id);
    }

    console.log('Using mock data for makeDecision:', { id, decision });
    return decision;
  };

  if (USE_MOCK_DATA) {
    return mockMakeDecision();
  }

  try {
    const response = await apiClient.post(`/arbitrator/claims/${id}/decision/`, data);
    return response.data;
  } catch (error: any) {
    if (error?.response?.status === 404 || error?.code === 'ERR_NETWORK') {
      console.warn('API endpoint not found, using mock data:', error?.response?.status || error?.code);
      return mockMakeDecision();
    }
    console.error(`Error making decision for claim ${id}:`, error);
    throw error;
  }
};

/**
 * Запросить дополнительную информацию
 */
export const requestInfo = async (id: number, data: RequestInfoRequest): Promise<void> => {
  try {
    await apiClient.post(`/arbitrator/claims/${id}/request-info/`, data);
  } catch (error) {
    console.error(`Error requesting info for claim ${id}:`, error);
    throw error;
  }
};

/**
 * Отправить на согласование дирекции
 */
export const sendForApproval = async (id: number, data: SendForApprovalRequest): Promise<void> => {
  const USE_MOCK_DATA = true; // Установите в false, когда API будет готов

  // Mock-реализация
  const mockSendForApproval = (): void => {
    // Сохраняем ID в localStorage
    savePendingApprovalClaimId(id);
    console.log('Using mock data for sendForApproval:', { id, message: data.message });
  };

  if (USE_MOCK_DATA) {
    mockSendForApproval();
    return;
  }

  try {
    await apiClient.post(`/arbitrator/claims/${id}/send-for-approval/`, data);
  } catch (error: any) {
    if (error?.response?.status === 404 || error?.code === 'ERR_NETWORK') {
      console.warn('API endpoint not found, using mock data:', error?.response?.status || error?.code);
      mockSendForApproval();
      return;
    }
    console.error(`Error sending claim ${id} for approval:`, error);
    throw error;
  }
};

// Внутренняя коммуникация

/**
 * Получение списка сообщений с дирекцией
 */
export const getMessages = async (params?: GetMessagesParams): Promise<PaginatedResponse<InternalMessage>> => {
  // Используем тестовые данные, если API недоступен (для разработки)
  const USE_MOCK_DATA = true; // Установите в false, когда API будет готов
  
  if (USE_MOCK_DATA) {
    const allMockMessages = generateMockMessages(params);
    const totalCount = allMockMessages.length;
    
    // Пагинация
    const page = params?.page || 1;
    const pageSize = params?.page_size || 20;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedMessages = allMockMessages.slice(startIndex, endIndex);
    
    console.log('Using mock messages:', { params, totalCount, resultsCount: paginatedMessages.length });
    return {
      count: totalCount,
      next: endIndex < totalCount ? 'next' : null,
      previous: page > 1 ? 'previous' : null,
      results: paginatedMessages,
    };
  }
  
  try {
    const response = await apiClient.get('/arbitrator/messages/', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching messages:', error);
    // Возвращаем тестовые данные для наглядности
    const allMockMessages = generateMockMessages(params);
    const totalCount = allMockMessages.length;
    
    // Пагинация
    const page = params?.page || 1;
    const pageSize = params?.page_size || 20;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedMessages = allMockMessages.slice(startIndex, endIndex);
    
    return {
      count: totalCount,
      next: endIndex < totalCount ? 'next' : null,
      previous: page > 1 ? 'previous' : null,
      results: paginatedMessages,
    };
  }
};

/**
 * Отправка сообщения дирекции
 */
export const sendMessage = async (data: SendMessageRequest): Promise<InternalMessage> => {
  const USE_MOCK_DATA = true; // Установите в false, когда API будет готов

  // Mock-реализация
  const mockSendMessage = (): InternalMessage => {
    const message: InternalMessage = {
      id: Date.now(), // Простой ID на основе времени
      sender: {
        id: 1,
        username: 'Арбитр Системный',
        role: 'arbitrator',
      },
      recipient: {
        id: 2,
        username: 'Директор',
        role: 'director',
      },
      text: data.text,
      claim_id: data.claim_id,
      priority: data.priority || 'medium',
      attachments: data.attachments?.map((file, index) => ({
        id: Date.now() + index,
        name: file.name,
        url: '#', // В реальном приложении URL будет получен от сервера
        size: file.size,
        type: file.type,
      })) || [],
      created_at: new Date().toISOString(),
      status: 'sent',
    };

    // Сохраняем сообщение в localStorage
    saveMessage(message);

    console.log('Using mock data for sendMessage:', { message });
    return message;
  };

  if (USE_MOCK_DATA) {
    return mockSendMessage();
  }

  try {
    const formData = new FormData();
    formData.append('text', data.text);
    if (data.claim_id) {
      formData.append('claim_id', data.claim_id.toString());
    }
    if (data.priority) {
      formData.append('priority', data.priority);
    }
    if (data.attachments) {
      data.attachments.forEach((file) => {
        formData.append('attachments', file);
      });
    }

    const response = await apiClient.post('/arbitrator/messages/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error: any) {
    if (error?.response?.status === 404 || error?.code === 'ERR_NETWORK') {
      console.warn('API endpoint not found, using mock data:', error?.response?.status || error?.code);
      return mockSendMessage();
    }
    console.error('Error sending message:', error);
    throw error;
  }
};

/**
 * Получение детальной информации о сообщении
 */
export const getMessage = async (id: number): Promise<InternalMessage> => {
  try {
    const response = await apiClient.get(`/arbitrator/messages/${id}/`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching message ${id}:`, error);
    throw error;
  }
};

/**
 * Отметить сообщение как прочитанное
 */
export const markMessageAsRead = async (id: number): Promise<void> => {
  try {
    await apiClient.post(`/arbitrator/messages/${id}/read/`);
  } catch (error) {
    console.error(`Error marking message ${id} as read:`, error);
    throw error;
  }
};

/**
 * Удалить сообщение (только свои)
 */
export const deleteMessage = async (id: number): Promise<void> => {
  try {
    await apiClient.delete(`/arbitrator/messages/${id}/`);
  } catch (error) {
    console.error(`Error deleting message ${id}:`, error);
    throw error;
  }
};

// Статистика

/**
 * Получение статистики
 */
export const getStatistics = async (params?: GetStatisticsParams): Promise<Statistics> => {
  try {
    const response = await apiClient.get('/arbitrator/statistics/', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching statistics:', error);
    // Возвращаем тестовую статистику для наглядности
    return generateMockStatistics();
  }
};

// Экспорт всех функций
export const arbitratorApi = {
  // Претензии
  getClaims,
  getClaim,
  takeClaim,
  makeDecision,
  requestInfo,
  sendForApproval,
  // Сообщения
  getMessages,
  sendMessage,
  getMessage,
  markMessageAsRead,
  deleteMessage,
  // Статистика
  getStatistics,
};
