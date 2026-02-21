import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../../api/client';

const API_BASE = '/admin-panel';
const isDebugEnabled = () =>
  import.meta.env.DEV &&
  typeof window !== 'undefined' &&
  window.localStorage?.getItem('debug_api') === '1';



export const useAllUsers = (enabled: boolean = true) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchUsers = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token || !enabled) {
      return;
    }
    
    setLoading(true);
    try {
      const response = await apiClient.get(`${API_BASE}/users/`);
      setUsers(response.data);
    } catch (err: any) {
      
      if (!err.silent && err.response?.status !== 401) {
        if (isDebugEnabled()) console.error('❌ useAllUsers - error:', err);
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (enabled) {
      fetchUsers();
    }
  }, [enabled, fetchUsers]);

  return { users, loading, error, refetch: fetchUsers };
};

export const useBlockedUsers = (enabled: boolean = true) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchBlockedUsers = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token || !enabled) return;
    
    setLoading(true);
    try {
      const response = await apiClient.get(`${API_BASE}/users/blocked/`);
      setUsers(response.data);
    } catch (err: any) {
      if (!err.silent && err.response?.status !== 401) {
        if (isDebugEnabled()) console.error('Error fetching blocked users:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (enabled) {
      fetchBlockedUsers();
    }
  }, [enabled, fetchBlockedUsers]);

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



export const useAllOrders = (enabled: boolean = true) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchOrders = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token || !enabled) return;
    
    setLoading(true);
    try {
      const response = await apiClient.get(`${API_BASE}/orders/`);
      setOrders(response.data);
    } catch (err: any) {
      if (!err.silent && err.response?.status !== 401) {
        if (isDebugEnabled()) console.error('Error fetching orders:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (enabled) {
      fetchOrders();
    }
  }, [enabled, fetchOrders]);

  return { orders, loading, refetch: fetchOrders };
};

export const useProblemOrders = (enabled: boolean = true) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchProblemOrders = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token || !enabled) return;
    
    setLoading(true);
    try {
      const response = await apiClient.get(`${API_BASE}/orders/problems/`);
      setOrders(response.data);
    } catch (err: any) {
      if (!err.silent && err.response?.status !== 401) {
        if (isDebugEnabled()) console.error('Error fetching problem orders:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (enabled) {
      fetchProblemOrders();
    }
  }, [enabled, fetchProblemOrders]);

  return { orders, loading, refetch: fetchProblemOrders };
};

export const useOrderActions = () => {
  const changeOrderStatus = async (orderId: number, status: string) => {
    await apiClient.post(`${API_BASE}/orders/${orderId}/change-status/`, { status });
  };

  return { changeOrderStatus };
};



export const useSupportRequests = (status?: string) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const url = status 
        ? `${API_BASE}/support-requests/?status=${status}`
        : `${API_BASE}/support-requests/`;
      const response = await apiClient.get(url);
      setRequests(response.data);
    } catch (err) {
      if (isDebugEnabled()) console.error('Error fetching support requests:', err);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  return { requests, loading, refetch: fetchRequests };
};

export const useSupportChats = (enabled: boolean = true) => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchChats = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token || !enabled) return;
    
    setLoading(true);
    try {
      const response = await apiClient.get(`${API_BASE}/support-chats/`);
      setChats(response.data);
    } catch (err: any) {
      if (!err.silent && err.response?.status !== 401) {
        if (isDebugEnabled()) console.error('Error fetching support chats:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (enabled) {
      fetchChats();
    }
  }, [enabled, fetchChats]);

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



export const useClaims = (status?: string, enabled: boolean = true) => {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchClaims = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token || !enabled) return;
    
    setLoading(true);
    try {
      const url = status 
        ? `${API_BASE}/claims/?status=${status}`
        : `${API_BASE}/claims/`;
      const response = await apiClient.get(url);
      
      setClaims(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      if (!err.silent && err.response?.status !== 401) {
        if (isDebugEnabled()) console.error('Error fetching claims:', err);
      }
      setClaims([]); 
    } finally {
      setLoading(false);
    }
  }, [enabled, status]);

  useEffect(() => {
    if (enabled) {
      fetchClaims();
    }
  }, [enabled, fetchClaims]);

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



export const useAdminChatRooms = (enabled: boolean = true) => {
  const [chatRooms, setChatRooms] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchChatRooms = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token || !enabled) return;
    
    setLoading(true);
    try {
      const response = await apiClient.get(`${API_BASE}/chat-rooms/`);
      
      setChatRooms(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      if (!err.silent && err.response?.status !== 401) {
        if (isDebugEnabled()) console.error('Error fetching chat rooms:', err);
      }
      setChatRooms([]); 
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (enabled) {
      fetchChatRooms();
    }
  }, [enabled, fetchChatRooms]);

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



export const useAdminStats = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`${API_BASE}/stats/`);
      setStats(response.data);
    } catch (err) {
      if (isDebugEnabled()) console.error('Error fetching admin stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, refetch: fetchStats };
};




export const useTickets = (enabled: boolean = true) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchTickets = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token || !enabled) return;
    
    setLoading(true);
    try {
      
      const [supportRequests, claims] = await Promise.all([
        apiClient.get(`${API_BASE}/support-requests/`),
        apiClient.get(`${API_BASE}/claims/`)
      ]);
      
      
      const allTickets = [
        ...supportRequests.data.map((req: any) => ({
          ...req,
          type: 'support_request',
          claim_type: null
        })),
        ...claims.data.map((claim: any) => ({
          ...claim,
          type: 'claim'
        }))
      ];
      
      
      allTickets.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setTickets(allTickets);
    } catch (err: any) {
      if (!err.silent && err.response?.status !== 401) {
        if (isDebugEnabled()) console.error('Error fetching tickets:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (enabled) {
      fetchTickets();
    }
  }, [enabled, fetchTickets]);

  return { tickets, loading, refetch: fetchTickets };
};

export const useTicketActions = () => {
  const sendMessage = async (ticketId: number, message: string, ticketType: 'support_request' | 'claim') => {
    const endpoint = ticketType === 'support_request' 
      ? `${API_BASE}/support-requests/${ticketId}/send_message/`
      : `${API_BASE}/claims/${ticketId}/send_message/`;
    
    const response = await apiClient.post(endpoint, { message });
    return response.data;
  };

  const updateStatus = async (ticketId: number, status: string, ticketType: 'support_request' | 'claim') => {
    const endpoint = ticketType === 'support_request'
      ? `${API_BASE}/support-requests/${ticketId}/`
      : `${API_BASE}/claims/${ticketId}/`;
    
    const response = await apiClient.patch(endpoint, { status });
    return response.data;
  };

  const updatePriority = async (ticketId: number, priority: string, ticketType: 'support_request' | 'claim') => {
    const endpoint = ticketType === 'support_request'
      ? `${API_BASE}/support-requests/${ticketId}/`
      : `${API_BASE}/claims/${ticketId}/`;
    
    const response = await apiClient.patch(endpoint, { priority });
    return response.data;
  };

  const assignAdmin = async (ticketId: number, adminId: number, ticketType: 'support_request' | 'claim') => {
    const endpoint = ticketType === 'support_request'
      ? `${API_BASE}/support-requests/${ticketId}/assign/`
      : `${API_BASE}/claims/${ticketId}/assign/`;
    
    const response = await apiClient.post(endpoint, { admin_id: adminId });
    return response.data;
  };

  return { sendMessage, updateStatus, updatePriority, assignAdmin };
};
