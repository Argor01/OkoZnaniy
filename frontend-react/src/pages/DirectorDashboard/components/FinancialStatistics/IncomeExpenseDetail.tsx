import React, { useState } from 'react';
import {
  Card,
  Tabs,
  Table,
  Button,
  Space,
  Spin,
  message,
  Typography,
  DatePicker,
  Select,
  Tag,
} from 'antd';
import {
  DownloadOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import dayjs, { Dayjs } from 'dayjs';
import {
  getIncomeDetail,
  getExpenseDetail,
  exportFinancialData,
  type IncomeDetail,
  type ExpenseDetail,
} from '../../api/directorApi';

const { Title } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const IncomeExpenseDetail: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('income');
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ]);
  const [incomeCategoryFilter, setIncomeCategoryFilter] = useState<string>('all');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState<string>('all');

  const { data: incomeData, isLoading: incomeLoading } = useQuery({
    queryKey: ['director-income-detail', dateRange[0].format('YYYY-MM-DD'), dateRange[1].format('YYYY-MM-DD')],
    queryFn: () =>
      getIncomeDetail(
        dateRange[0].format('YYYY-MM-DD'),
        dateRange[1].format('YYYY-MM-DD')
      ),
    onError: (error: any) => {
      message.error('Ошибка при загрузке данных доходов');
    },
  });

  const { data: expenseData, isLoading: expenseLoading } = useQuery({
    queryKey: ['director-expense-detail', dateRange[0].format('YYYY-MM-DD'), dateRange[1].format('YYYY-MM-DD')],
    queryFn: () =>
      getExpenseDetail(
        dateRange[0].format('YYYY-MM-DD'),
        dateRange[1].format('YYYY-MM-DD')
      ),
    onError: (error: any) => {
      message.error('Ошибка при загрузке данных расходов');
    },
  });

  const handleExport = async (format: 'excel' | 'csv' | 'pdf') => {
    try {
      const blob = await exportFinancialData(
        dateRange[0].format('YYYY-MM-DD'),
        dateRange[1].format('YYYY-MM-DD'),
        format
      );
      
      // Создаём ссылку для скачивания
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const ext = format === 'excel' ? 'xlsx' : format === 'csv' ? 'csv' : 'pdf';
      link.download = `financial_data_${dateRange[0].format('YYYY-MM-DD')}_${dateRange[1].format('YYYY-MM-DD')}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      message.success('Данные успешно экспортированы');
    } catch (error: any) {
      message.error('Ошибка при экспорте данных');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Выручка от заказов': 'green',
      'Комиссии от партнёров': 'blue',
      'Прочие доходы': 'orange',
      'Выплаты экспертам': 'red',
      'Выплаты партнёрам': 'purple',
      'Операционные расходы': 'cyan',
      'Налоги': 'volcano',
    };
    return colors[category] || 'default';
  };

  const filteredIncomeData = incomeData?.filter((item) => {
    if (incomeCategoryFilter === 'all') return true;
    return item.category === incomeCategoryFilter;
  }) || [];

  const filteredExpenseData = expenseData?.filter((item) => {
    if (expenseCategoryFilter === 'all') return true;
    return item.category === expenseCategoryFilter;
  }) || [];

  const incomeCategories = Array.from(new Set(incomeData?.map((item) => item.category) || []));
  const expenseCategories = Array.from(new Set(expenseData?.map((item) => item.category) || []));

  const totalIncome = filteredIncomeData.reduce((sum, item) => sum + item.amount, 0);
  const totalExpense = filteredExpenseData.reduce((sum, item) => sum + item.amount, 0);

  const incomeColumns = [
    {
      title: 'Дата',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => dayjs(date).format('DD.MM.YYYY'),
      sorter: (a: IncomeDetail, b: IncomeDetail) =>
        dayjs(a.date).unix() - dayjs(b.date).unix(),
    },
    {
      title: 'Категория',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => (
        <Tag color={getCategoryColor(category)}>{category}</Tag>
      ),
      filters: incomeCategories.map((cat) => ({ text: cat, value: cat })),
      onFilter: (value: any, record: IncomeDetail) => record.category === value,
    },
    {
      title: 'Сумма',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => formatCurrency(amount),
      sorter: (a: IncomeDetail, b: IncomeDetail) => a.amount - b.amount,
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Детали',
      key: 'details',
      render: (_: any, record: IncomeDetail) => (
        <Space>
          {(record.orderId || record.order_id) && (
            <Button type="link" size="small">
              Заказ #{record.orderId || record.order_id}
            </Button>
          )}
          {(record.partnerId || record.partner_id) && (
            <Button type="link" size="small">
              Партнёр #{record.partnerId || record.partner_id}
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const expenseColumns = [
    {
      title: 'Дата',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => dayjs(date).format('DD.MM.YYYY'),
      sorter: (a: ExpenseDetail, b: ExpenseDetail) =>
        dayjs(a.date).unix() - dayjs(b.date).unix(),
    },
    {
      title: 'Категория',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => (
        <Tag color={getCategoryColor(category)}>{category}</Tag>
      ),
      filters: expenseCategories.map((cat) => ({ text: cat, value: cat })),
      onFilter: (value: any, record: ExpenseDetail) => record.category === value,
    },
    {
      title: 'Сумма',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => formatCurrency(amount),
      sorter: (a: ExpenseDetail, b: ExpenseDetail) => a.amount - b.amount,
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Получатель',
      dataIndex: 'recipientName',
      key: 'recipientName',
      render: (_: any, record: ExpenseDetail) => (record.recipientName || record.recipient_name || '-'),
    },
  ];

  return (
    <div>
      <Card>
        <Title level={4}>Детализация доходов и расходов</Title>

        {/* Селектор периода и экспорт */}
        <Space direction="vertical" style={{ width: '100%', marginBottom: 24 }} size="large">
          <Space>
            <RangePicker
              value={dateRange}
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  setDateRange([dates[0], dates[1]]);
                }
              }}
              format="DD.MM.YYYY"
            />
            <Button
              icon={<FileExcelOutlined />}
              onClick={() => handleExport('excel')}
            >
              Экспорт в Excel
            </Button>
            <Button
              icon={<FileTextOutlined />}
              onClick={() => handleExport('csv')}
            >
              Экспорт в CSV
            </Button>
            <Button
              icon={<FilePdfOutlined />}
              onClick={() => handleExport('pdf')}
            >
              Экспорт в PDF
            </Button>
          </Space>
        </Space>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'income',
              label: 'Доходы',
              children: (
                <div>
                  <Space style={{ marginBottom: 16 }}>
                    <Select
                      placeholder="Фильтр по категории"
                      style={{ width: 200 }}
                      value={incomeCategoryFilter}
                      onChange={setIncomeCategoryFilter}
                    >
                      <Option value="all">Все категории</Option>
                      {incomeCategories.map((cat) => (
                        <Option key={cat} value={cat}>
                          {cat}
                        </Option>
                      ))}
                    </Select>
                  </Space>
                  <Spin spinning={incomeLoading}>
                    <Table
                      columns={incomeColumns}
                      dataSource={filteredIncomeData}
                      rowKey={(record) => `income-${record.id || record.date}-${record.amount}`}
                      pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                        showTotal: (total) => `Всего: ${total}`,
                      }}
                      summary={(pageData) => {
                        const total = pageData.reduce((sum, record) => sum + record.amount, 0);
                        return (
                          <Table.Summary fixed>
                            <Table.Summary.Row>
                              <Table.Summary.Cell index={0} colSpan={2}>
                                <strong>Итого:</strong>
                              </Table.Summary.Cell>
                              <Table.Summary.Cell index={2}>
                                <strong>{formatCurrency(total)}</strong>
                              </Table.Summary.Cell>
                              <Table.Summary.Cell index={3} colSpan={2} />
                            </Table.Summary.Row>
                          </Table.Summary>
                        );
                      }}
                    />
                  </Spin>
                </div>
              ),
            },
            {
              key: 'expense',
              label: 'Расходы',
              children: (
                <div>
                  <Space style={{ marginBottom: 16 }}>
                    <Select
                      placeholder="Фильтр по категории"
                      style={{ width: 200 }}
                      value={expenseCategoryFilter}
                      onChange={setExpenseCategoryFilter}
                    >
                      <Option value="all">Все категории</Option>
                      {expenseCategories.map((cat) => (
                        <Option key={cat} value={cat}>
                          {cat}
                        </Option>
                      ))}
                    </Select>
                  </Space>
                  <Spin spinning={expenseLoading}>
                    <Table
                      columns={expenseColumns}
                      dataSource={filteredExpenseData}
                      rowKey={(record) => `expense-${record.id || record.date}-${record.amount}`}
                      pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                        showTotal: (total) => `Всего: ${total}`,
                      }}
                      summary={(pageData) => {
                        const total = pageData.reduce((sum, record) => sum + record.amount, 0);
                        return (
                          <Table.Summary fixed>
                            <Table.Summary.Row>
                              <Table.Summary.Cell index={0} colSpan={2}>
                                <strong>Итого:</strong>
                              </Table.Summary.Cell>
                              <Table.Summary.Cell index={2}>
                                <strong>{formatCurrency(total)}</strong>
                              </Table.Summary.Cell>
                              <Table.Summary.Cell index={3} colSpan={2} />
                            </Table.Summary.Row>
                          </Table.Summary>
                        );
                      }}
                    />
                  </Spin>
                </div>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
};

export default IncomeExpenseDetail;
