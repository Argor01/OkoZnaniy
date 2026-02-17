import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = '/api/admin-panel';

// ============= ПОЛЬЗОВАТЕЛИ =============

export const useAllUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/users/`);
      setUsers(response.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return { users, loading, error, refetch: fetchUsers };
};

export const useBlockedUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchBlockedUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/users/blocked/`);
      setUsers(response.data);
    } catch (err) {
      console.error('Error fetching blocked users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlockedUsers();
  }, []);

  return { users, loading, refetch: fetchBlockedUsers };
};

export const useUserActions = () => {
  const blockUser = async (userId: number) => {
    await axios.post(`${API_BASE}/users/${userId}/block/`);
  };

  const unblockUser = async (userId: number) => {
    await axios.post(`${API_BASE}/users/${userId}/unblock/`);
  };

  const changeUserRole = async (userId: number, role: string) => {
    await axios.post(`${API_BASE}/users/${userId}/change-role/`, { role });
  };

  return { blockUser, unblockUser, changeUserRole };
};

// ============= ЗАКАЗЫ =============

export const useAllOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/orders/`);
      setOrders(response.data);
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  return { orders, loading, refetch: fetchOrders };
};

export const useProblemOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchProblemOrders = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/orders/problems/`);
      setOrders(response.data);
    } catch (err) {
      console.error('Error fetching problem orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProblemOrders();
  }, []);

  return { orders, loading, refetch: fetchProblemOrders };
};

export const useOrderActions = () => {
  const changeOrderStatus = async (orderId: number, status: string) => {
    await axios.post(`${API_BASE}/orders/${orderId}/change-status/`, { status });
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
      const response = await axios.get(url);
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

export const useSupportChats = () => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchChats = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/support-chats/`);
      setChats(response.data);
    } catch (err) {
      console.error('Error fetching support chats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChats();
  }, []);

  return { chats, loading, refetch: fetchChats };
};

export const useSupportActions = () => {
  const takeRequest = async (requestId: number) => {
    await axios.post(`${API_BASE}/support-requests/${requestId}/take_request/`);
  };

  const completeRequest = async (requestId: number) => {
    await axios.post(`${API_BASE}/support-requests/${requestId}/complete_request/`);
  };

  const sendMessage = async (requestId: number, message: string) => {
    await axios.post(`${API_BASE}/support-requests/${requestId}/send_message/`, { message });
  };

  const sendChatMessage = async (chatId: number, message: string) => {
    await axios.post(`${API_BASE}/support-chats/${chatId}/send-message/`, { message });
  };

  return { takeRequest, completeRequest, sendMessage, sendChatMessage };
};

// ============= ОБРАЩЕНИЯ =============

export const useClaims = (status?: string) => {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const url = status 
        ? `${API_BASE}/claims/?status=${status}`
        : `${API_BASE}/claims/`;
      const response = await axios.get(url);
      // Убеждаемся, что данные - это массив
      setClaims(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Error fetching claims:', err);
      setClaims([]); // Устанавливаем пустой массив при ошибке
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, [status]);

  return { claims, loading, refetch: fetchClaims };
};

export const useClaimActions = () => {
  const takeInWork = async (claimId: number) => {
    await axios.post(`${API_BASE}/claims/${claimId}/take_in_work/`);
  };

  const completeClaim = async (claimId: number, resolution: string) => {
    await axios.post(`${API_BASE}/claims/${claimId}/complete_claim/`, { resolution });
  };

  const rejectClaim = async (claimId: number, reason: string) => {
    await axios.post(`${API_BASE}/claims/${claimId}/reject_claim/`, { reason });
  };

  return { takeInWork, completeClaim, rejectClaim };
};

// ============= ЧАТЫ АДМИНИСТРАТОРОВ =============

export const useAdminChatRooms = () => {
  const [chatRooms, setChatRooms] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchChatRooms = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/chat-rooms/`);
      setChatRooms(response.data);
    } catch (err) {
      console.error('Error fetching chat rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChatRooms();
  }, []);

  return { chatRooms, loading, refetch: fetchChatRooms };
};

export const useChatRoomActions = () => {
  const sendMessage = async (roomId: number, message: string) => {
    await axios.post(`${API_BASE}/chat-rooms/${roomId}/send_message/`, { message });
  };

  const joinRoom = async (roomId: number) => {
    await axios.post(`${API_BASE}/chat-rooms/${roomId}/join_room/`);
  };

  const leaveRoom = async (roomId: number) => {
    await axios.post(`${API_BASE}/chat-rooms/${roomId}/leave_room/`);
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
      const response = await axios.get(`${API_BASE}/stats/`);
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
