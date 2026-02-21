import { apiClient } from './client';
import dayjs from 'dayjs';

export interface Dispute {
  id: number;
  order: {
    id: number;
    title: string;
    client: { id: number; username: string };
    expert: { id: number; username: string } | null;
  };
  reason: string;
  resolved: boolean;
  result: string | null;
  arbitrator: { id: number; username: string } | null;
  created_at: string;
}

export interface CreateDisputeRequest {
  reason: string;
}

export interface AssignArbitratorRequest {
  arbitrator_id: number;
}

export interface ResolveDisputeRequest {
  result: string;
}


const USE_MOCK_DATA = false;


const getAssignedArbitrators = (): Map<number, number> => {
  try {
    const stored = localStorage.getItem('admin_assigned_arbitrators');
    if (stored) {
      const assignments = JSON.parse(stored) as Array<[number, number]>;
      return new Map(assignments);
    }
  } catch (e) {
    console.warn('Error reading assigned arbitrators from localStorage:', e);
  }
  return new Map<number, number>();
};

const saveAssignedArbitrator = (disputeId: number, arbitratorId: number): void => {
  try {
    const assignments = getAssignedArbitrators();
    assignments.set(disputeId, arbitratorId);
    localStorage.setItem('admin_assigned_arbitrators', JSON.stringify(Array.from(assignments.entries())));
  } catch (e) {
    console.warn('Error saving assigned arbitrator to localStorage:', e);
  }
};


const generateMockDisputes = (): Dispute[] => {
  const assignedArbitrators = getAssignedArbitrators();
  const arbitrators = [
    { id: 1, username: 'Александр Иванов' },
    { id: 2, username: 'Елена Петрова' },
    { id: 3, username: 'Сергей Смирнов' },
    { id: 4, username: 'Мария Козлова' },
  ];

  const baseDisputes: Dispute[] = [
    {
      id: 1,
      order: {
        id: 101,
        title: 'Дипломная работа по экономике',
        client: { id: 1, username: 'Иван Иванов' },
        expert: { id: 2, username: 'Мария Петрова' },
      },
      reason: 'Качество работы не соответствует требованиям. Много ошибок и неточностей.',
      resolved: false,
      result: null,
      arbitrator: assignedArbitrators.has(1) 
        ? arbitrators.find(a => a.id === assignedArbitrators.get(1)) || null
        : null,
      created_at: dayjs().subtract(2, 'days').toISOString(),
    },
    {
      id: 2,
      order: {
        id: 102,
        title: 'Курсовая работа по программированию',
        client: { id: 3, username: 'Петр Петров' },
        expert: { id: 4, username: 'Алексей Смирнов' },
      },
      reason: 'Работа выполнена не в срок. Задержка составила 3 дня.',
      resolved: true,
      result: 'Решение в пользу клиента. Возврат 50% средств.',
      arbitrator: assignedArbitrators.has(2)
        ? arbitrators.find(a => a.id === assignedArbitrators.get(2)) || arbitrators[0]
        : arbitrators[0],
      created_at: dayjs().subtract(5, 'days').toISOString(),
    },
    {
      id: 3,
      order: {
        id: 103,
        title: 'Реферат по истории',
        client: { id: 5, username: 'Анна Козлова' },
        expert: { id: 6, username: 'Елена Волкова' },
      },
      reason: 'Работа содержит плагиат. Требуется переделка.',
      resolved: false,
      result: null,
      arbitrator: assignedArbitrators.has(3)
        ? arbitrators.find(a => a.id === assignedArbitrators.get(3)) || null
        : null,
      created_at: dayjs().subtract(1, 'day').toISOString(),
    },
    {
      id: 4,
      order: {
        id: 104,
        title: 'Контрольная работа по математике',
        client: { id: 7, username: 'Сергей Лебедев' },
        expert: { id: 8, username: 'Татьяна Соколова' },
      },
      reason: 'Некоторые задачи решены неправильно. Требуется исправление.',
      resolved: false,
      result: null,
      arbitrator: assignedArbitrators.has(4)
        ? arbitrators.find(a => a.id === assignedArbitrators.get(4)) || null
        : null,
      created_at: dayjs().subtract(3, 'days').toISOString(),
    },
    {
      id: 5,
      order: {
        id: 105,
        title: 'Эссе по философии',
        client: { id: 9, username: 'Игорь Павлов' },
        expert: { id: 10, username: 'Юлия Иванова' },
      },
      reason: 'Работа не соответствует заявленной теме.',
      resolved: true,
      result: 'Решение в пользу эксперта. Работа соответствует требованиям.',
      arbitrator: assignedArbitrators.has(5)
        ? arbitrators.find(a => a.id === assignedArbitrators.get(5)) || arbitrators[1]
        : arbitrators[1],
      created_at: dayjs().subtract(7, 'days').toISOString(),
    },
    {
      id: 6,
      order: {
        id: 106,
        title: 'Лабораторная работа по физике',
        client: { id: 11, username: 'Николай Федоров' },
        expert: { id: 12, username: 'Ольга Морозова' },
      },
      reason: 'Результаты экспериментов неверны. Требуется пересдача.',
      resolved: false,
      result: null,
      arbitrator: assignedArbitrators.has(6)
        ? arbitrators.find(a => a.id === assignedArbitrators.get(6)) || null
        : null,
      created_at: dayjs().subtract(4, 'hours').toISOString(),
    },
  ];

  return baseDisputes.sort((a, b) => dayjs(b.created_at).valueOf() - dayjs(a.created_at).valueOf());
};

export const disputesApi = {
  
  getDisputes: async (): Promise<Dispute[]> => {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return generateMockDisputes();
    }

    try {
      const response = await apiClient.get('/orders/disputes/');
      const data = response.data;
      
      if (data?.data?.results && Array.isArray(data.data.results)) {
        return data.data.results;
      }
      if (Array.isArray(data)) {
        return data;
      }
      if (data?.results && Array.isArray(data.results)) {
        return data.results;
      }
      return [];
    } catch (error: any) {
      if (error.response?.status === 404 || error.code === 'ERR_NETWORK') {
        console.log('API недоступен, используем mock данные для споров');
        return generateMockDisputes();
      }
      throw error;
    }
  },

  
  getMyDisputes: async (): Promise<Dispute[]> => {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return generateMockDisputes();
    }

    try {
      const response = await apiClient.get('/orders/disputes/my_disputes/');
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404 || error.code === 'ERR_NETWORK') {
        console.log('API недоступен, используем mock данные для споров арбитра');
        return generateMockDisputes();
      }
      throw error;
    }
  },

  
  getDispute: async (id: number): Promise<Dispute> => {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 300));
      const disputes = generateMockDisputes();
      const dispute = disputes.find(d => d.id === id);
      if (!dispute) {
        throw new Error('Спор не найден');
      }
      return dispute;
    }

    try {
      const response = await apiClient.get(`/orders/disputes/${id}/`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404 || error.code === 'ERR_NETWORK') {
        console.log('API недоступен, используем mock данные для спора');
        const disputes = generateMockDisputes();
        const dispute = disputes.find(d => d.id === id);
        if (!dispute) {
          throw new Error('Спор не найден');
        }
        return dispute;
      }
      throw error;
    }
  },

  
  createDispute: async (orderId: number, data: CreateDisputeRequest): Promise<Dispute> => {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      throw new Error('Создание спора через mock данные не поддерживается');
    }

    const response = await apiClient.post(`/orders/orders/${orderId}/create_dispute/`, data);
    return response.data;
  },

  
  assignArbitrator: async (disputeId: number, data: AssignArbitratorRequest): Promise<Dispute> => {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 300));
      saveAssignedArbitrator(disputeId, data.arbitrator_id);
      const disputes = generateMockDisputes();
      const dispute = disputes.find(d => d.id === disputeId);
      if (!dispute) {
        throw new Error('Спор не найден');
      }
      const arbitrators = [
        { id: 1, username: 'Александр Иванов' },
        { id: 2, username: 'Елена Петрова' },
        { id: 3, username: 'Сергей Смирнов' },
        { id: 4, username: 'Мария Козлова' },
      ];
      const arbitrator = arbitrators.find(a => a.id === data.arbitrator_id);
      return {
        ...dispute,
        arbitrator: arbitrator || null,
      };
    }

    try {
      const response = await apiClient.post(`/orders/disputes/${disputeId}/assign_arbitrator/`, data);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404 || error.code === 'ERR_NETWORK') {
        console.log('API недоступен, используем mock данные для назначения арбитра');
        saveAssignedArbitrator(disputeId, data.arbitrator_id);
        const disputes = generateMockDisputes();
        const dispute = disputes.find(d => d.id === disputeId);
        if (!dispute) {
          throw new Error('Спор не найден');
        }
        const arbitrators = [
          { id: 1, username: 'Александр Иванов' },
          { id: 2, username: 'Елена Петрова' },
          { id: 3, username: 'Сергей Смирнов' },
          { id: 4, username: 'Мария Козлова' },
        ];
        const arbitrator = arbitrators.find(a => a.id === data.arbitrator_id);
        return {
          ...dispute,
          arbitrator: arbitrator || null,
        };
      }
      throw error;
    }
  },

  
  resolveDispute: async (disputeId: number, data: ResolveDisputeRequest): Promise<Dispute> => {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      throw new Error('Решение спора через mock данные не поддерживается');
    }

    const response = await apiClient.post(`/orders/disputes/${disputeId}/resolve/`, data);
    return response.data;
  },
};
