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

