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
import { 
  mockEmployees, 
  mockExpertApplications, 
  mockArchivedEmployees,
  generateMonthlyTurnover,
  generateNetProfit,
  generateIncomeDetails,
  generateExpenseDetails,
  mockPartners,
  generatePartnersTurnover,
  generateKPI,
  generateStatisticsSummary,
} from './mockData';

// Флаг для использования тестовых данных (можно переключить на false для работы с реальным API)
const USE_MOCK_DATA = true;

// Управление персоналом
export const getPersonnel = async (): Promise<Employee[]> => {
  if (USE_MOCK_DATA) {
    // Используем тестовые данные с небольшой задержкой для имитации запроса
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockEmployees.filter(emp => emp.is_active);
  }
  try {
    const response = await apiClient.get('/director/personnel/');
    return response.data;
  } catch (error) {
    console.error('Error fetching personnel:', error);
    // Fallback на тестовые данные при ошибке
    console.warn('Using mock data as fallback');
    return mockEmployees.filter(emp => emp.is_active);
  }
};

export const registerEmployee = async (data: RegisterEmployeeRequest): Promise<Employee> => {
  if (USE_MOCK_DATA) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const newEmployee: Employee = {
      id: mockEmployees.length + 1,
      email: data.email,
      first_name: data.first_name,
      last_name: data.last_name,
      phone: data.phone || '',
      role: data.role,
      is_active: true,
      date_joined: new Date().toISOString(),
      username: data.username || data.email,
    };
    mockEmployees.push(newEmployee);
    return newEmployee;
  }
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
  if (USE_MOCK_DATA) {
    // Используем тестовые данные с небольшой задержкой для имитации запроса
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockExpertApplications;
  }
  try {
    const response = await apiClient.get('/director/personnel/expert-applications/');
    return response.data;
  } catch (error) {
    console.error('Error fetching expert applications:', error);
    // Fallback на тестовые данные при ошибке
    console.warn('Using mock data as fallback');
    return mockExpertApplications;
  }
};

export const approveApplication = async (id: number): Promise<ExpertApplication> => {
  if (USE_MOCK_DATA) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const application = mockExpertApplications.find(app => app.id === id);
    if (application) {
      application.status = 'approved';
      application.application_approved = true;
      application.application_reviewed_at = new Date().toISOString();
      return application;
    }
    throw new Error('Application not found');
  }
  try {
    const response = await apiClient.post(`/director/personnel/expert-applications/${id}/approve/`);
    return response.data;
  } catch (error) {
    console.error('Error approving application:', error);
    throw error;
  }
};

export const rejectApplication = async (id: number, reason: string): Promise<ExpertApplication> => {
  if (USE_MOCK_DATA) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const application = mockExpertApplications.find(app => app.id === id);
    if (application) {
      application.status = 'rejected';
      application.application_approved = false;
      application.application_reviewed_at = new Date().toISOString();
      return application;
    }
    throw new Error('Application not found');
  }
  try {
    const response = await apiClient.post(`/director/personnel/expert-applications/${id}/reject/`, { reason });
    return response.data;
  } catch (error) {
    console.error('Error rejecting application:', error);
    throw error;
  }
};

export const sendForRework = async (id: number, comment: string): Promise<ExpertApplication> => {
  if (USE_MOCK_DATA) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const application = mockExpertApplications.find(app => app.id === id);
    if (application) {
      application.status = 'under_review';
      application.application_reviewed_at = new Date().toISOString();
      return application;
    }
    throw new Error('Application not found');
  }
  try {
    const response = await apiClient.post(`/director/personnel/expert-applications/${id}/rework/`, { comment });
    return response.data;
  } catch (error) {
    console.error('Error sending application for rework:', error);
    throw error;
  }
};

export const deactivateEmployee = async (id: number): Promise<Employee> => {
  if (USE_MOCK_DATA) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const employee = mockEmployees.find(emp => emp.id === id);
    if (employee) {
      employee.is_active = false;
      return employee;
    }
    throw new Error('Employee not found');
  }
  try {
    const response = await apiClient.post(`/director/personnel/${id}/deactivate/`);
    return response.data;
  } catch (error) {
    console.error('Error deactivating employee:', error);
    throw error;
  }
};

export const activateEmployee = async (id: number): Promise<Employee> => {
  if (USE_MOCK_DATA) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const employee = mockEmployees.find(emp => emp.id === id);
    if (employee) {
      employee.is_active = true;
      return employee;
    }
    throw new Error('Employee not found');
  }
  try {
    const response = await apiClient.post(`/director/personnel/${id}/activate/`);
    return response.data;
  } catch (error) {
    console.error('Error activating employee:', error);
    throw error;
  }
};

export const archiveEmployee = async (id: number): Promise<Employee> => {
  if (USE_MOCK_DATA) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const employee = mockEmployees.find(emp => emp.id === id);
    if (employee) {
      employee.is_active = false;
      // Перемещаем в архив
      const archivedEmployee = { ...employee };
      if (!mockArchivedEmployees.find(emp => emp.id === id)) {
        mockArchivedEmployees.push(archivedEmployee);
      }
      // Удаляем из активных
      const index = mockEmployees.findIndex(emp => emp.id === id);
      if (index > -1) {
        mockEmployees.splice(index, 1);
      }
      return archivedEmployee;
    }
    throw new Error('Employee not found');
  }
  try {
    const response = await apiClient.post(`/director/personnel/${id}/archive/`);
    return response.data;
  } catch (error) {
    console.error('Error archiving employee:', error);
    throw error;
  }
};

export const getArchivedEmployees = async (): Promise<Employee[]> => {
  if (USE_MOCK_DATA) {
    // Используем тестовые данные с небольшой задержкой для имитации запроса
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockArchivedEmployees;
  }
  try {
    const response = await apiClient.get('/director/personnel/archive/');
    return response.data;
  } catch (error) {
    console.error('Error fetching archived employees:', error);
    // Fallback на тестовые данные при ошибке
    console.warn('Using mock data as fallback');
    return mockArchivedEmployees;
  }
};

// Финансовая статистика
export const getMonthlyTurnover = async (period?: string): Promise<MonthlyTurnover> => {
  if (USE_MOCK_DATA) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const month = period || dayjs().format('YYYY-MM');
    return generateMonthlyTurnover(month);
  }
  try {
    const params = period ? { period } : {};
    const response = await apiClient.get('/director/finance/turnover/', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching monthly turnover:', error);
    // Fallback на тестовые данные при ошибке
    console.warn('Using mock data as fallback');
    const month = period || dayjs().format('YYYY-MM');
    return generateMonthlyTurnover(month);
  }
};

export const getNetProfit = async (startDate: string, endDate: string): Promise<NetProfit> => {
  if (USE_MOCK_DATA) {
    await new Promise(resolve => setTimeout(resolve, 500));
    return generateNetProfit(startDate, endDate);
  }
  try {
    const response = await apiClient.get('/director/finance/net-profit/', {
      params: { start_date: startDate, end_date: endDate },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching net profit:', error);
    // Fallback на тестовые данные при ошибке
    console.warn('Using mock data as fallback');
    return generateNetProfit(startDate, endDate);
  }
};

export const getIncomeDetail = async (startDate: string, endDate: string): Promise<IncomeDetail[]> => {
  if (USE_MOCK_DATA) {
    await new Promise(resolve => setTimeout(resolve, 500));
    return generateIncomeDetails(startDate, endDate);
  }
  try {
    const response = await apiClient.get('/director/finance/income/', {
      params: { start_date: startDate, end_date: endDate },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching income detail:', error);
    // Fallback на тестовые данные при ошибке
    console.warn('Using mock data as fallback');
    return generateIncomeDetails(startDate, endDate);
  }
};

export const getExpenseDetail = async (startDate: string, endDate: string): Promise<ExpenseDetail[]> => {
  if (USE_MOCK_DATA) {
    await new Promise(resolve => setTimeout(resolve, 500));
    return generateExpenseDetails(startDate, endDate);
  }
  try {
    const response = await apiClient.get('/director/finance/expense/', {
      params: { start_date: startDate, end_date: endDate },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching expense detail:', error);
    // Fallback на тестовые данные при ошибке
    console.warn('Using mock data as fallback');
    return generateExpenseDetails(startDate, endDate);
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
  if (USE_MOCK_DATA) {
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockPartners;
  }
  try {
    const response = await apiClient.get('/director/partners/');
    return response.data;
  } catch (error) {
    console.error('Error fetching partners:', error);
    // Fallback на тестовые данные при ошибке
    console.warn('Using mock data as fallback');
    return mockPartners;
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
  if (USE_MOCK_DATA) {
    await new Promise(resolve => setTimeout(resolve, 500));
    return generatePartnersTurnover(period);
  }
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
    // Fallback на тестовые данные при ошибке
    console.warn('Using mock data as fallback');
    return generatePartnersTurnover(period);
  }
};

export const updatePartnerCommission = async (
  partnerId: number,
  commission: number
): Promise<Partner> => {
  if (USE_MOCK_DATA) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const partner = mockPartners.find(p => p.id === partnerId);
    if (partner) {
      partner.commissionPercent = commission;
      partner.commission_percent = commission;
      return partner;
    }
    throw new Error('Partner not found');
  }
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
  if (USE_MOCK_DATA) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const partner = mockPartners.find(p => p.id === partnerId);
    if (partner) {
      partner.isActive = !partner.isActive;
      partner.is_active = !partner.is_active;
      partner.status = partner.isActive ? 'active' : 'inactive';
      return partner;
    }
    throw new Error('Partner not found');
  }
  try {
    const response = await apiClient.post(`/director/partners/${partnerId}/toggle-status/`);
    return response.data;
  } catch (error) {
    console.error('Error toggling partner status:', error);
    throw error;
  }
};

export const restoreEmployee = async (id: number): Promise<Employee> => {
  if (USE_MOCK_DATA) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const employee = mockArchivedEmployees.find(emp => emp.id === id);
    if (employee) {
      employee.is_active = true;
      // Возвращаем в активные
      if (!mockEmployees.find(emp => emp.id === id)) {
        mockEmployees.push(employee);
      }
      // Удаляем из архива
      const index = mockArchivedEmployees.findIndex(emp => emp.id === id);
      if (index > -1) {
        mockArchivedEmployees.splice(index, 1);
      }
      return employee;
    }
    throw new Error('Employee not found');
  }
  try {
    const response = await apiClient.post(`/director/personnel/${id}/restore/`);
    return response.data;
  } catch (error) {
    console.error('Error restoring employee:', error);
    throw error;
  }
};

export const deleteEmployee = async (id: number): Promise<void> => {
  if (USE_MOCK_DATA) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const index = mockArchivedEmployees.findIndex(emp => emp.id === id);
    if (index > -1) {
      mockArchivedEmployees.splice(index, 1);
    }
    return;
  }
  try {
    await apiClient.delete(`/director/personnel/${id}/`);
  } catch (error) {
    console.error('Error deleting employee:', error);
    throw error;
  }
};

// Общая статистика
export const getKPI = async (startDate: string, endDate: string): Promise<KPI> => {
  if (USE_MOCK_DATA) {
    await new Promise(resolve => setTimeout(resolve, 500));
    return generateKPI(startDate, endDate);
  }
  try {
    const response = await apiClient.get('/director/statistics/kpi/', {
      params: { start_date: startDate, end_date: endDate },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching KPI:', error);
    // Fallback на тестовые данные при ошибке
    console.warn('Using mock data as fallback');
    return generateKPI(startDate, endDate);
  }
};

export const getStatisticsSummary = async (
  startDate: string,
  endDate: string
): Promise<StatisticsSummary> => {
  if (USE_MOCK_DATA) {
    await new Promise(resolve => setTimeout(resolve, 500));
    return generateStatisticsSummary(startDate, endDate);
  }
  try {
    const response = await apiClient.get('/director/statistics/summary/', {
      params: { start_date: startDate, end_date: endDate },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching statistics summary:', error);
    // Fallback на тестовые данные при ошибке
    console.warn('Using mock data as fallback');
    return generateStatisticsSummary(startDate, endDate);
  }
};

export const exportStatisticsReport = async (
  startDate: string,
  endDate: string,
  format: 'excel' | 'pdf',
  data: StatisticsSummary
): Promise<void> => {
  if (USE_MOCK_DATA) {
    // Клиентский экспорт для тестовых данных
    if (format === 'excel') {
      // Экспорт в CSV (совместим с Excel)
      const csvContent = generateCSV(data, startDate, endDate);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `statistics_${startDate}_${endDate}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return;
    } else if (format === 'pdf') {
      // Простой экспорт в PDF через HTML
      const htmlContent = generatePDFHTML(data, startDate, endDate);
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.onload = () => {
          printWindow.print();
        };
      }
      return;
    }
  }

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

// Генерация CSV для экспорта
const generateCSV = (data: StatisticsSummary, startDate: string, endDate: string): string => {
  const kpi = data.kpi || {};
  const previousPeriod = data.previous_period || data.previousPeriod || {};
  
  const rows = [
    ['Отчёт по статистике', ''],
    [`Период: ${startDate} - ${endDate}`, ''],
    ['', ''],
    ['Показатель', 'Текущий период', 'Предыдущий период', 'Изменение'],
    ['Общий оборот', formatNumber(kpi.total_turnover || kpi.totalTurnover || 0), formatNumber(previousPeriod.total_turnover || previousPeriod.totalTurnover || 0), formatChange(data.turnover_change || data.turnoverChange || 0)],
    ['Чистая прибыль', formatNumber(kpi.net_profit || kpi.netProfit || 0), formatNumber(previousPeriod.net_profit || previousPeriod.netProfit || 0), formatChange(data.profit_change || data.profitChange || 0)],
    ['Активные заказы', formatNumber(kpi.active_orders || kpi.activeOrders || 0), formatNumber(previousPeriod.active_orders || previousPeriod.activeOrders || 0), formatChange(data.orders_change || data.ordersChange || 0)],
    ['Средний чек', formatNumber(kpi.average_check || kpi.averageCheck || 0), formatNumber(previousPeriod.average_check || previousPeriod.averageCheck || 0), formatChange(data.average_check_change || data.averageCheckChange || 0)],
    ['Всего клиентов', formatNumber(kpi.total_clients || kpi.totalClients || 0), formatNumber(previousPeriod.total_clients || previousPeriod.totalClients || 0), ''],
    ['Всего экспертов', formatNumber(kpi.total_experts || kpi.totalExperts || 0), formatNumber(previousPeriod.total_experts || previousPeriod.totalExperts || 0), ''],
    ['Всего партнёров', formatNumber(kpi.total_partners || kpi.totalPartners || 0), formatNumber(previousPeriod.total_partners || previousPeriod.totalPartners || 0), ''],
    ['Конверсия', `${kpi.conversion_rate || kpi.conversionRate || 0}%`, `${previousPeriod.conversion_rate || previousPeriod.conversionRate || 0}%`, ''],
  ];
  
  return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
};

// Генерация HTML для PDF
const generatePDFHTML = (data: StatisticsSummary, startDate: string, endDate: string): string => {
  const kpi = data.kpi || {};
  const previousPeriod = data.previous_period || data.previousPeriod || {};
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Отчёт по статистике</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #1890ff; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f0f0f0; }
        .positive { color: green; }
        .negative { color: red; }
      </style>
    </head>
    <body>
      <h1>Отчёт по статистике</h1>
      <p><strong>Период:</strong> ${startDate} - ${endDate}</p>
      <table>
        <tr>
          <th>Показатель</th>
          <th>Текущий период</th>
          <th>Предыдущий период</th>
          <th>Изменение</th>
        </tr>
        <tr>
          <td>Общий оборот</td>
          <td>${formatNumber(kpi.total_turnover || kpi.totalTurnover || 0)} ₽</td>
          <td>${formatNumber(previousPeriod.total_turnover || previousPeriod.totalTurnover || 0)} ₽</td>
          <td class="${(data.turnover_change || data.turnoverChange || 0) >= 0 ? 'positive' : 'negative'}">${formatChange(data.turnover_change || data.turnoverChange || 0)}</td>
        </tr>
        <tr>
          <td>Чистая прибыль</td>
          <td>${formatNumber(kpi.net_profit || kpi.netProfit || 0)} ₽</td>
          <td>${formatNumber(previousPeriod.net_profit || previousPeriod.netProfit || 0)} ₽</td>
          <td class="${(data.profit_change || data.profitChange || 0) >= 0 ? 'positive' : 'negative'}">${formatChange(data.profit_change || data.profitChange || 0)}</td>
        </tr>
        <tr>
          <td>Активные заказы</td>
          <td>${formatNumber(kpi.active_orders || kpi.activeOrders || 0)}</td>
          <td>${formatNumber(previousPeriod.active_orders || previousPeriod.activeOrders || 0)}</td>
          <td class="${(data.orders_change || data.ordersChange || 0) >= 0 ? 'positive' : 'negative'}">${formatChange(data.orders_change || data.ordersChange || 0)}</td>
        </tr>
        <tr>
          <td>Средний чек</td>
          <td>${formatNumber(kpi.average_check || kpi.averageCheck || 0)} ₽</td>
          <td>${formatNumber(previousPeriod.average_check || previousPeriod.averageCheck || 0)} ₽</td>
          <td class="${(data.average_check_change || data.averageCheckChange || 0) >= 0 ? 'positive' : 'negative'}">${formatChange(data.average_check_change || data.averageCheckChange || 0)}</td>
        </tr>
        <tr>
          <td>Всего клиентов</td>
          <td>${formatNumber(kpi.total_clients || kpi.totalClients || 0)}</td>
          <td>${formatNumber(previousPeriod.total_clients || previousPeriod.totalClients || 0)}</td>
          <td>-</td>
        </tr>
        <tr>
          <td>Всего экспертов</td>
          <td>${formatNumber(kpi.total_experts || kpi.totalExperts || 0)}</td>
          <td>${formatNumber(previousPeriod.total_experts || previousPeriod.totalExperts || 0)}</td>
          <td>-</td>
        </tr>
        <tr>
          <td>Всего партнёров</td>
          <td>${formatNumber(kpi.total_partners || kpi.totalPartners || 0)}</td>
          <td>${formatNumber(previousPeriod.total_partners || previousPeriod.totalPartners || 0)}</td>
          <td>-</td>
        </tr>
        <tr>
          <td>Конверсия</td>
          <td>${kpi.conversion_rate || kpi.conversionRate || 0}%</td>
          <td>${previousPeriod.conversion_rate || previousPeriod.conversionRate || 0}%</td>
          <td>-</td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

// Вспомогательные функции для форматирования
const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('ru-RU').format(value);
};

const formatChange = (value: number): string => {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
};

// Коммуникация с арбитрами

// Хранилище для сообщений директора
const getSavedMessages = (): InternalMessage[] => {
  try {
    const stored = localStorage.getItem('director_messages');
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
    localStorage.setItem('director_messages', JSON.stringify(messages));
  } catch (e) {
    console.warn('Error saving message to localStorage:', e);
  }
};

/**
 * Генерация тестовых сообщений для директора
 */
const generateMockMessages = (params?: GetMessagesParams): InternalMessage[] => {
  const now = new Date();
  const savedMessages = getSavedMessages();
  
  // Получаем сообщения от арбитров из их localStorage
  let arbitratorMessages: InternalMessage[] = [];
  try {
    const stored = localStorage.getItem('arbitrator_messages');
    if (stored) {
      arbitratorMessages = JSON.parse(stored) as InternalMessage[];
      // Фильтруем только сообщения от арбитров директору
      arbitratorMessages = arbitratorMessages.filter((m) => 
        m.sender.role === 'arbitrator' && m.recipient.role === 'director'
      );
    }
  } catch (e) {
    console.warn('Error reading arbitrator messages from localStorage:', e);
  }
  
  // Базовые сообщения от арбитров (используем те же данные, что и в arbitratorApi)
  const baseMessages: InternalMessage[] = [
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
  ];
  
  // Объединяем базовые сообщения с сообщениями из localStorage арбитра
  const allMessages = [...arbitratorMessages, ...baseMessages];
  
  // Фильтрация по обращению
  let filteredMessages = allMessages;
  if (params?.claim_id) {
    filteredMessages = filteredMessages.filter((m) => m.claim_id === params.claim_id);
  }

  // Фильтрация непрочитанных
  if (params?.unread_only) {
    filteredMessages = filteredMessages.filter((m) => !m.read_at);
  }

  // Добавляем сохраненные сообщения директора (ответы)
  if (savedMessages.length > 0) {
    let savedFiltered = savedMessages;
    if (params?.claim_id) {
      savedFiltered = savedFiltered.filter((m) => m.claim_id === params.claim_id);
    }
    if (params?.unread_only) {
      savedFiltered = savedFiltered.filter((m) => !m.read_at);
    }
    filteredMessages = [...savedFiltered, ...filteredMessages];
  }
  
  // Удаляем дубликаты по ID
  const uniqueMessages = Array.from(new Map(filteredMessages.map(m => [m.id, m])).values());
  
  // Сортируем по дате создания (новые первыми)
  uniqueMessages.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return uniqueMessages;
};

/**
 * Получение списка сообщений от арбитров
 */
export const getMessages = async (params?: GetMessagesParams): Promise<PaginatedResponse<InternalMessage>> => {
  if (USE_MOCK_DATA) {
    const allMessages = generateMockMessages(params);
    const totalCount = allMessages.length;
    
    // Пагинация
    const page = params?.page || 1;
    const pageSize = params?.page_size || 20;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedMessages = allMessages.slice(startIndex, endIndex);
    
    console.log('Using mock messages for director:', { params, totalCount, resultsCount: paginatedMessages.length });
    return {
      count: totalCount,
      next: endIndex < totalCount ? 'next' : null,
      previous: page > 1 ? 'previous' : null,
      results: paginatedMessages,
    };
  }

  try {
    const response = await apiClient.get('/director/messages/', { params });
    return response.data;
  } catch (error: any) {
    if (error?.response?.status === 404 || error?.code === 'ERR_NETWORK') {
      console.warn('API endpoint not found, using mock data:', error?.response?.status || error?.code);
      const allMessages = generateMockMessages(params);
      const totalCount = allMessages.length;
      const page = params?.page || 1;
      const pageSize = params?.page_size || 20;
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedMessages = allMessages.slice(startIndex, endIndex);
      return {
        count: totalCount,
        next: endIndex < totalCount ? 'next' : null,
        previous: page > 1 ? 'previous' : null,
        results: paginatedMessages,
      };
    }
    console.error('Error fetching messages:', error);
    throw error;
  }
};

/**
 * Отправка сообщения арбитру
 */
export const sendMessage = async (data: SendMessageRequest): Promise<InternalMessage> => {
  const USE_MOCK_DATA = true;

  const mockSendMessage = (): InternalMessage => {
    const message: InternalMessage = {
      id: Date.now(),
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
      text: data.text,
      claim_id: data.claim_id,
      priority: data.priority || 'medium',
      attachments: data.attachments?.map((file, index) => ({
        id: Date.now() + index,
        name: file.name,
        url: '#',
        size: file.size,
        type: file.type,
      })) || [],
      created_at: new Date().toISOString(),
      status: 'sent',
    };

    saveMessage(message);
    console.log('Using mock data for sendMessage (director):', { message });
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

    const response = await apiClient.post('/director/messages/', formData, {
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
 * Получение списка обращений, отправленных на согласование
 */
// Импортируем функцию генерации mock-данных из arbitratorApi (через общий механизм)
// Или создаем свою функцию генерации на основе данных из localStorage
const generateMockClaimsForDirector = (): Claim[] => {
  const now = new Date();
  const claims: Claim[] = [];
  
  // Получаем ID обращений, отправленных на согласование
  try {
    const stored = localStorage.getItem('arbitrator_pending_approval_claims');
    if (stored) {
      const ids = JSON.parse(stored) as number[];
      // Получаем решения из localStorage
      const decisionsStored = localStorage.getItem('arbitrator_decisions');
      const decisions = decisionsStored ? new Map(JSON.parse(decisionsStored) as Array<[number, any]>) : new Map();
      
      // Генерируем mock-данные для этих обращений
      ids.forEach((id) => {
        const decision = decisions.get(id);
        // Используем базовые данные в зависимости от ID
        let baseData: Partial<Claim> = {};
        
        if (id === 1001) {
          baseData = {
            order: {
              id: 501,
              title: 'Дипломная работа по экономике',
              description: 'Требуется написание дипломной работы по теме "Современные тенденции развития малого бизнеса"',
              amount: 15000,
              created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
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
            type: 'refund',
            priority: 'high',
          };
        } else if (id === 2001) {
          baseData = {
            order: {
              id: 601,
              title: 'Дипломная работа по праву',
              description: 'Анализ судебной практики по гражданским делам',
              amount: 20000,
              created_at: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(),
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
            type: 'refund',
            priority: 'high',
          };
        } else if (id === 2002) {
          baseData = {
            order: {
              id: 602,
              title: 'Контрольная работа по математике',
              description: 'Решение задач по линейной алгебре',
              amount: 4000,
              created_at: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000).toISOString(),
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
            type: 'dispute',
            priority: 'medium',
          };
        } else {
          // Дефолтные данные для других ID
          baseData = {
            order: {
              id: id + 4000,
              title: `Обращение #${id}`,
              description: 'Требуется согласование дирекции',
              amount: 15000,
              created_at: new Date().toISOString(),
              status: 'cancelled',
            },
            client: {
              id: 201,
              username: 'Клиент',
              email: 'client@example.com',
            },
            expert: {
              id: 301,
              username: 'Эксперт',
              email: 'expert@example.com',
              rating: 4.5,
            },
            type: 'refund',
            priority: 'high',
          };
        }
        
        claims.push({
          id,
          status: 'pending_approval',
          created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
          taken_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          arbitrator: {
            id: 1,
            username: 'Арбитр Системный',
          },
          decision: decision || {
            id: 1,
            claim_id: id,
            decision_type: 'full_refund',
            reasoning: 'Решение требует согласования дирекции',
            created_at: new Date().toISOString(),
            arbitrator: { id: 1, username: 'Арбитр Системный' },
            requires_approval: true,
            approval_status: 'pending',
            approval_comment: 'Ожидает решения дирекции',
          },
          messages: [],
          attachments: [],
          ...baseData,
        } as Claim);
      });
    }
  } catch (e) {
    console.warn('Error generating mock claims for director:', e);
  }
  
  return claims;
};

/**
 * Получение списка обращений, отправленных на согласование
 */
export const getPendingApprovalClaims = async (): Promise<Claim[]> => {
  if (USE_MOCK_DATA) {
    const claims = generateMockClaimsForDirector();
    return claims;
  }
  
  try {
    const response = await apiClient.get('/director/claims/pending-approval/');
    return response.data;
  } catch (error: any) {
    if (error?.response?.status === 404 || error?.code === 'ERR_NETWORK') {
      console.warn('API endpoint not found, using mock data');
      return generateMockClaimsForDirector();
    }
    console.error('Error fetching pending approval claims:', error);
    throw error;
  }
};

/**
 * Отметка сообщения как прочитанное
 */
export const markMessageAsRead = async (id: number): Promise<void> => {
  if (USE_MOCK_DATA) {
    // В реальном приложении это будет обновлять статус на сервере
    console.log('Marking message as read (mock):', id);
    return;
  }
  try {
    await apiClient.post(`/director/messages/${id}/read/`);
  } catch (error) {
    console.error('Error marking message as read:', error);
    throw error;
  }
};

/**
 * Удаление сообщения
 */
export const deleteMessage = async (id: number): Promise<void> => {
  if (USE_MOCK_DATA) {
    const messages = getSavedMessages();
    const filtered = messages.filter((m) => m.id !== id);
    localStorage.setItem('director_messages', JSON.stringify(filtered));
    console.log('Deleting message (mock):', id);
    return;
  }
  try {
    await apiClient.delete(`/director/messages/${id}/`);
  } catch (error) {
    console.error('Error deleting message:', error);
    throw error;
  }
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

