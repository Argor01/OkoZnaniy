import { apiClient } from '../../../api/client';
import dayjs from 'dayjs';
import type {
  Employee,
  ExpertApplication,
  RegisterEmployeeRequest,
  MonthlyTurnover,
  NetProfit,
  IncomeDetail,
  ExpenseDetail,
  Partner,
  PartnerTurnoverResponse,
  KPI,
  StatisticsSummary,
  InternalMessage,
  GetMessagesParams,
  PaginatedResponse,
  SendMessageRequest,
  Claim,
} from './types';

// Управление персоналом
export const getPersonnel = async (): Promise<Employee[]> => {
  try {
    // Загружаем все страницы пагинации
    let allEmployees: Employee[] = [];
    let nextUrl: string | null = '/director/personnel/';
    
    while (nextUrl) {
      const response = await apiClient.get(nextUrl);
      const data = response.data;
      const results = data?.results || data || [];
      if (Array.isArray(results)) {
        allEmployees = [...allEmployees, ...results];
      }
      // Получаем URL следующей страницы (убираем /api из пути, т.к. apiClient уже добавляет его)
      if (data?.next) {
        const url = new URL(data.next);
        // Убираем /api из начала пути, если он есть
        nextUrl = url.pathname.replace(/^\/api/, '') + url.search;
      } else {
        nextUrl = null;
      }
    }
    
    return allEmployees;
  } catch (error) {
    console.error('Error fetching personnel:', error);
    throw error;
  }
};

export const registerEmployee = async (data: RegisterEmployeeRequest): Promise<Employee> => {
  try {
    // Преобразуем данные в формат, ожидаемый API
    const requestData = {
      email: data.email,
      first_name: data.first_name,
      last_name: data.last_name,
      phone: data.phone || '',
      role: data.role,
      password: data.password,
      username: data.username || data.email, // Используем email как username, если не указан
    };
    const response = await apiClient.post('/director/personnel/register/', requestData);
    return response.data;
  } catch (error) {
    console.error('Error registering employee:', error);
    throw error;
  }
};

export const getExpertApplications = async (): Promise<ExpertApplication[]> => {
  try {
    const response = await apiClient.get('/director/personnel/expert-applications/');
    const raw = response.data?.results || response.data || [];
    return (raw as any[]).map((app: any) => {
      const specs = typeof app.specializations === 'string'
        ? app.specializations.split(/[\n,]+/).map((s: string) => s.trim()).filter((s: string) => !!s)
        : Array.isArray(app.specializations) ? app.specializations : [];
      const educationStr = Array.isArray(app.educations)
        ? app.educations.map((e: any) => {
            const period = e.end_year ? `${e.start_year}-${e.end_year}` : `${e.start_year}-н.в.`;
            const degree = e.degree ? `, ${e.degree}` : '';
            return `${e.university} (${period})${degree}`;
          }).join('; ')
        : (app.education || '');
      const statusMap = app.status === 'pending' ? 'under_review' : app.status;
      return {
        id: app.id,
        user: app.expert || app.user,
        experience_years: app.work_experience_years ?? app.experience_years,
        education: educationStr,
        skills: app.skills,
        portfolio_url: app.portfolio_url,
        bio: app.bio,
        biography: app.biography,
        specializations: specs,
        status: statusMap,
        submitted_at: app.created_at,
        reviewed_at: app.reviewed_at,
        application_submitted_at: app.created_at,
        application_reviewed_at: app.reviewed_at,
        application_approved: app.status === 'approved',
      } as ExpertApplication;
    });
  } catch (error) {
    console.error('Error fetching expert applications:', error);
    throw error;
  }
};

export const approveApplication = async (id: number): Promise<ExpertApplication> => {
  try {
    const response = await apiClient.post(`/director/personnel/expert-applications/${id}/approve/`);
    return response.data;
  } catch (error) {
    console.error('Error approving application:', error);
    throw error;
  }
};

export const rejectApplication = async (id: number, reason: string): Promise<ExpertApplication> => {
  try {
    const response = await apiClient.post(`/director/personnel/expert-applications/${id}/reject/`, { reason });
    return response.data;
  } catch (error) {
    console.error('Error rejecting application:', error);
    throw error;
  }
};

export const sendForRework = async (id: number, comment: string): Promise<ExpertApplication> => {
  try {
    const response = await apiClient.post(`/director/personnel/expert-applications/${id}/rework/`, { comment });
    return response.data;
  } catch (error) {
    console.error('Error sending application for rework:', error);
    throw error;
  }
};

export const deactivateEmployee = async (id: number): Promise<Employee> => {
  try {
    const response = await apiClient.post(`/director/personnel/${id}/deactivate/`);
    return response.data;
  } catch (error) {
    console.error('Error deactivating employee:', error);
    throw error;
  }
};

export const activateEmployee = async (id: number): Promise<Employee> => {
  try {
    const response = await apiClient.post(`/director/personnel/${id}/activate/`);
    return response.data;
  } catch (error) {
    console.error('Error activating employee:', error);
    throw error;
  }
};

export const archiveEmployee = async (id: number): Promise<Employee> => {
  try {
    const response = await apiClient.post(`/director/personnel/${id}/archive/`);
    return response.data;
  } catch (error) {
    console.error('Error archiving employee:', error);
    throw error;
  }
};

export const getArchivedEmployees = async (): Promise<Employee[]> => {
  try {
    const response = await apiClient.get('/director/personnel/archive/');
    return response.data;
  } catch (error) {
    console.error('Error fetching archived employees:', error);
    throw error;
  }
};

export const restoreEmployee = async (id: number): Promise<Employee> => {
  try {
    const response = await apiClient.post(`/director/personnel/${id}/restore/`);
    return response.data;
  } catch (error) {
    console.error('Error restoring employee:', error);
    throw error;
  }
};

export const deleteEmployee = async (id: number): Promise<void> => {
  try {
    await apiClient.delete(`/director/personnel/${id}/`);
  } catch (error) {
    console.error('Error deleting employee:', error);
    throw error;
  }
};

// Финансовая статистика
export const getMonthlyTurnover = async (period?: string): Promise<MonthlyTurnover> => {
  try {
    const params = period ? { period } : {};
    const response = await apiClient.get('/director/finance/turnover/', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching monthly turnover:', error);
    throw error;
  }
};

export const getNetProfit = async (startDate: string, endDate: string): Promise<NetProfit> => {
  try {
    const response = await apiClient.get('/director/finance/net-profit/', {
      params: { start_date: startDate, end_date: endDate },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching net profit:', error);
    throw error;
  }
};

export const getIncomeDetail = async (startDate: string, endDate: string): Promise<IncomeDetail[]> => {
  try {
    const response = await apiClient.get('/director/finance/income/', {
      params: { start_date: startDate, end_date: endDate },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching income detail:', error);
    throw error;
  }
};

export const getExpenseDetail = async (startDate: string, endDate: string): Promise<ExpenseDetail[]> => {
  try {
    const response = await apiClient.get('/director/finance/expense/', {
      params: { start_date: startDate, end_date: endDate },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching expense detail:', error);
    throw error;
  }
};

export const exportFinancialData = async (
  startDate: string,
  endDate: string,
  format: 'excel' | 'csv' | 'pdf'
): Promise<Blob> => {
  try {
    const response = await apiClient.get('/director/finance/export/', {
      params: { start_date: startDate, end_date: endDate, format },
      responseType: 'blob',
    });
    return response.data;
  } catch (error) {
    console.error('Error exporting financial data:', error);
    throw error;
  }
};

// Панель партнёров
export const getPartners = async (): Promise<Partner[]> => {
  try {
    const response = await apiClient.get('/director/partners/');
    return response.data;
  } catch (error) {
    console.error('Error fetching partners:', error);
    throw error;
  }
};

export const getPartnerTurnover = async (
  partnerId: number,
  startDate: string,
  endDate: string
): Promise<PartnerTurnoverResponse> => {
  try {
    const response = await apiClient.get(`/director/partners/${partnerId}/turnover/`, {
      params: { start_date: startDate, end_date: endDate },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching partner turnover:', error);
    throw error;
  }
};

export const getAllPartnersTurnover = async (
  period: string | [string, string]
): Promise<PartnerTurnoverResponse> => {
  try {
    let params: any = {};
    if (typeof period === 'string') {
      // Если передан месяц в формате YYYY-MM, преобразуем в диапазон дат
      const startDate = dayjs(period).startOf('month').format('YYYY-MM-DD');
      const endDate = dayjs(period).endOf('month').format('YYYY-MM-DD');
      params = { start_date: startDate, end_date: endDate };
    } else {
      params = { start_date: period[0], end_date: period[1] };
    }
    const response = await apiClient.get('/director/partners/turnover/', {
      params,
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching all partners turnover:', error);
    throw error;
  }
};

export const updatePartnerCommission = async (
  partnerId: number,
  commission: number
): Promise<Partner> => {
  try {
    const response = await apiClient.patch(`/director/partners/${partnerId}/commission/`, {
      commission_percent: commission,
    });
    return response.data;
  } catch (error) {
    console.error('Error updating partner commission:', error);
    throw error;
  }
};

export const togglePartnerStatus = async (partnerId: number): Promise<Partner> => {
  try {
    const response = await apiClient.post(`/director/partners/${partnerId}/toggle-status/`);
    return response.data;
  } catch (error) {
    console.error('Error toggling partner status:', error);
    throw error;
  }
};

// Общая статистика (из БД)
export const getKPI = async (startDate: string, endDate: string): Promise<KPI> => {
  try {
    const response = await apiClient.get('/director/statistics/kpi/', {
      params: { start_date: startDate, end_date: endDate },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching KPI:', error);
    throw error;
  }
};

export const getStatisticsSummary = async (
  startDate: string,
  endDate: string
): Promise<StatisticsSummary> => {
  try {
    const response = await apiClient.get('/director/statistics/summary/', {
      params: { start_date: startDate, end_date: endDate },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching statistics summary:', error);
    throw error;
  }
};

export const exportStatisticsReport = async (
  startDate: string,
  endDate: string,
  format: 'excel' | 'pdf'
): Promise<void> => {
  try {
    const response = await apiClient.get('/director/statistics/export/', {
      params: { start_date: startDate, end_date: endDate, format },
      responseType: 'blob',
    });
    
    // Скачиваем файл
    const blob = new Blob([response.data]);
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `statistics_${startDate}_${endDate}.${format === 'excel' ? 'xlsx' : 'pdf'}`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting statistics report:', error);
    throw error;
  }
};

// Коммуникация с арбитрами (заглушки для совместимости)
export const getMessages = async (params?: GetMessagesParams): Promise<PaginatedResponse<InternalMessage>> => {
  // Заглушка - возвращаем пустой список
  return {
    count: 0,
    next: null,
    previous: null,
    results: [],
  };
};

export const sendMessage = async (data: SendMessageRequest): Promise<InternalMessage> => {
  // Заглушка
  throw new Error('Not implemented');
};

export const getPendingApprovalClaims = async (): Promise<Claim[]> => {
  // Заглушка - возвращаем пустой список
  return [];
};

export const markMessageAsRead = async (id: number): Promise<void> => {
  // Заглушка
};

export const deleteMessage = async (id: number): Promise<void> => {
  // Заглушка
};

// Экспорт всех функций в виде объекта
export const directorApi = {
  // Управление персоналом
  getPersonnel,
  registerEmployee,
  getExpertApplications,
  approveApplication,
  rejectApplication,
  sendForRework,
  deactivateEmployee,
  activateEmployee,
  archiveEmployee,
  getArchivedEmployees,
  restoreEmployee,
  deleteEmployee,
  // Финансовая статистика
  getMonthlyTurnover,
  getNetProfit,
  getIncomeDetail,
  getExpenseDetail,
  exportFinancialData,
  // Панель партнёров
  getPartners,
  getPartnerTurnover,
  getAllPartnersTurnover,
  updatePartnerCommission,
  togglePartnerStatus,
  // Общая статистика
  getKPI,
  getStatisticsSummary,
  exportStatisticsReport,
  // Коммуникация с арбитрами
  getMessages,
  sendMessage,
  getPendingApprovalClaims,
  markMessageAsRead,
  deleteMessage,
};