import { useState, useEffect } from 'react';
import { apiClient } from '../../../api/client';

const API_BASE = '/admin-panel';

// ============= ПОЛЬЗОВАТЕЛИ =============

export const useAllUsers = (enabled: boolean = true) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchUsers = async () => {
    // Проверяем наличие токена перед запросом
    const token = localStorage.getItem('access_token');
    console.log('🔍 useAllUsers - enabled:', enabled, 'token:', !!token);
    if (!token || !enabled) {
      return;
    }
    
    setLoading(true);
    try {
      const response = await apiClient.get(`${API_BASE}/users/`);
      console.log('✅ useAllUsers - received data:', response.data);
      console.log('✅ useAllUsers - data type:', Array.isArray(response.data) ? 'array' : typeof response.data);
      console.log('✅ useAllUsers - data length:', response.data?.length);
      setUsers(response.data);
    } catch (err: any) {
      // Игнорируем тихие ошибки и 401 (не авторизован)
      if (!err.silent && err.response?.status !== 401) {
        console.error('❌ useAllUsers - error:', err);
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (enabled) {
      fetchUsers();
    }
  }, [enabled]);

  console.log('🎯 useAllUsers - returning users:', users.length, 'loading:', loading);
  return { users, loading, error, refetch: fetchUsers };
};

export const useBlockedUsers = (enabled: boolean = true) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchBlockedUsers = async () => {
    const token = localStorage.getItem('access_token');
    if (!token || !enabled) return;
    
    setLoading(true);
    try {
      const response = await apiClient.get(`${API_BASE}/users/blocked/`);
      setUsers(response.data);
    } catch (err: any) {
      if (!err.silent && err.response?.status !== 401) {
        console.error('Error fetching blocked users:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (enabled) {
      fetchBlockedUsers();
    }
  }, [enabled]);

  return { users, loading, refetch: fetchBlockedUsers };
};

export const useUserActions = () => {
  const blockUser = async (userId: number) => {
    await apiClient.post(`${API_BASE}/users/${userId}/block/`);
  };

  const unblockUser = async (userId: number) => {
    await apiClient.post(`${API_BASE}/users/${userId}/unblock/`);
  };

  const changeUserRole = async (userId: number, role: string) => {
    await apiClient.post(`${API_BASE}/users/${userId}/change-role/`, { role });
  };

  return { blockUser, unblockUser, changeUserRole };
};

// ============= ЗАКАЗЫ =============

export const useAllOrders = (enabled: boolean = true) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchOrders = async () => {
    const token = localStorage.getItem('access_token');
    if (!token || !enabled) return;
    
    setLoading(true);
    try {
      const response = await apiClient.get(`${API_BASE}/orders/`);
      setOrders(response.data);
    } catch (err: any) {
      if (!err.silent && err.response?.status !== 401) {
        console.error('Error fetching orders:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (enabled) {
      fetchOrders();
    }
  }, [enabled]);

  return { orders, loading, refetch: fetchOrders };
};

export const useProblemOrders = (enabled: boolean = true) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchProblemOrders = async () => {
    const token = localStorage.getItem('access_token');
    if (!token || !enabled) return;
    
    setLoading(true);
    try {
      const response = await apiClient.get(`${API_BASE}/orders/problems/`);
      setOrders(response.data);
    } catch (err: any) {
      if (!err.silent && err.response?.status !== 401) {
        console.error('Error fetching problem orders:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (enabled) {
      fetchProblemOrders();
    }
  }, [enabled]);

  return { orders, loading, refetch: fetchProblemOrders };
};

export const useOrderActions = () => {
  const changeOrderStatus = async (orderId: number, status: string) => {
    await apiClient.post(`${API_BASE}/orders/${orderId}/change-status/`, { status });
  };

  return { changeOrderStatus };
};

// ============= ПОДДЕРЖКА =============

export const useSupportRequests = (status?: string) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const url = status 
        ? `${API_BASE}/support-requests/?status=${status}`
        : `${API_BASE}/support-requests/`;
      const response = await apiClient.get(url);
      setRequests(response.data);
    } catch (err) {
      console.error('Error fetching support requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [status]);

  return { requests, loading, refetch: fetchRequests };
};

export const useSupportChats = (enabled: boolean = true) => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchChats = async () => {
    const token = localStorage.getItem('access_token');
    if (!token || !enabled) return;
    
    setLoading(true);
    try {
      const response = await apiClient.get(`${API_BASE}/support-chats/`);
      setChats(response.data);
    } catch (err: any) {
      if (!err.silent && err.response?.status !== 401) {
        console.error('Error fetching support chats:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (enabled) {
      fetchChats();
    }
  }, [enabled]);

  return { chats, loading, refetch: fetchChats };
};

export const useSupportActions = () => {
  const takeRequest = async (requestId: number) => {
    await apiClient.post(`${API_BASE}/support-requests/${requestId}/take_request/`);
  };

  const completeRequest = async (requestId: number) => {
    await apiClient.post(`${API_BASE}/support-requests/${requestId}/complete_request/`);
  };

  const sendMessage = async (requestId: number, message: string) => {
    await apiClient.post(`${API_BASE}/support-requests/${requestId}/send_message/`, { message });
  };

  const sendChatMessage = async (chatId: number, message: string) => {
    await apiClient.post(`${API_BASE}/support-chats/${chatId}/send-message/`, { message });
  };

  return { takeRequest, completeRequest, sendMessage, sendChatMessage };
};

// ============= ОБРАЩЕНИЯ =============

export const useClaims = (status?: string, enabled: boolean = true) => {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchClaims = async () => {
    const token = localStorage.getItem('access_token');
    if (!token || !enabled) return;
    
    setLoading(true);
    try {
      const url = status 
        ? `${API_BASE}/claims/?status=${status}`
        : `${API_BASE}/claims/`;
      const response = await apiClient.get(url);
      // Убеждаемся, что данные - это массив
      setClaims(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      if (!err.silent && err.response?.status !== 401) {
        console.error('Error fetching claims:', err);
      }
      setClaims([]); // Устанавливаем пустой массив при ошибке
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (enabled) {
      fetchClaims();
    }
  }, [status, enabled]);

  return { claims, loading, refetch: fetchClaims };
};

export const useClaimActions = () => {
  const takeInWork = async (claimId: number) => {
    await apiClient.post(`${API_BASE}/claims/${claimId}/take_in_work/`);
  };

  const completeClaim = async (claimId: number, resolution: string) => {
    await apiClient.post(`${API_BASE}/claims/${claimId}/complete_claim/`, { resolution });
  };

  const rejectClaim = async (claimId: number, reason: string) => {
    await apiClient.post(`${API_BASE}/claims/${claimId}/reject_claim/`, { reason });
  };

  return { takeInWork, completeClaim, rejectClaim };
};

// ============= ЧАТЫ АДМИНИСТРАТОРОВ =============

export const useAdminChatRooms = (enabled: boolean = true) => {
  const [chatRooms, setChatRooms] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchChatRooms = async () => {
    const token = localStorage.getItem('access_token');
    if (!token || !enabled) return;
    
    setLoading(true);
    try {
      const response = await apiClient.get(`${API_BASE}/chat-rooms/`);
      // Убеждаемся, что данные - это массив
      setChatRooms(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      if (!err.silent && err.response?.status !== 401) {
        console.error('Error fetching chat rooms:', err);
      }
      setChatRooms([]); // Устанавливаем пустой массив при ошибке
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (enabled) {
      fetchChatRooms();
    }
  }, [enabled]);

  return { chatRooms, loading, refetch: fetchChatRooms };
};

export const useChatRoomActions = () => {
  const sendMessage = async (roomId: number, message: string) => {
    await apiClient.post(`${API_BASE}/chat-rooms/${roomId}/send_message/`, { message });
  };

  const joinRoom = async (roomId: number) => {
    await apiClient.post(`${API_BASE}/chat-rooms/${roomId}/join_room/`);
  };

  const leaveRoom = async (roomId: number) => {
    await apiClient.post(`${API_BASE}/chat-rooms/${roomId}/leave_room/`);
  };

  return { sendMessage, joinRoom, leaveRoom };
};

// ============= СТАТИСТИКА =============

export const useAdminStats = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`${API_BASE}/stats/`);
      setStats(response.data);
    } catch (err) {
      console.error('Error fetching admin stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return { stats, loading, refetch: fetchStats };
};
