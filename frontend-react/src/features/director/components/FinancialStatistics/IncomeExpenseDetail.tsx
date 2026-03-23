import React, { useState } from 'react';
import { Card, Row, Col, Statistic, DatePicker, Space, Button, Spin, Table, Tag, Modal, Form, Input, InputNumber, Select, message, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import dayjs, { Dayjs } from 'dayjs';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getIncomeDetail, getExpenseDetail, addIncome, addExpense } from '@/features/director/api/directorApi';
import apiClient from '@/api/client';
import mobileStyles from '@/features/director/components/shared/MobileDatePicker.module.css';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Text } = Typography;

const IncomeExpenseDetail: React.FC = () => {
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ]);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [addType, setAddType] = useState<'income' | 'expense'>('income');
  const [tableFilter, setTableFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const isMobile = window.innerWidth <= 840;

  
  const { data: incomeData, isLoading: incomeLoading } = useQuery({
    queryKey: ['income-detail', dateRange[0].format('YYYY-MM-DD'), dateRange[1].format('YYYY-MM-DD')],
    queryFn: () => getIncomeDetail(dateRange[0].format('YYYY-MM-DD'), dateRange[1].format('YYYY-MM-DD')),
    refetchOnMount: true,
    staleTime: 0,
  });

  const { data: expenseData, isLoading: expenseLoading } = useQuery({
    queryKey: ['expense-detail', dateRange[0].format('YYYY-MM-DD'), dateRange[1].format('YYYY-MM-DD')],
    queryFn: () => getExpenseDetail(dateRange[0].format('YYYY-MM-DD'), dateRange[1].format('YYYY-MM-DD')),
    refetchOnMount: true,
    staleTime: 0,
  });

  const isLoading = incomeLoading || expenseLoading;

  
  const chartData = React.useMemo(() => {
    if (!incomeData || !expenseData) return [];
    
    const dataByDate: Record<string, { date: string; income: number; expense: number }> = {};
    
    incomeData.forEach(item => {
      const date = dayjs(item.date).format('DD.MM');
      if (!dataByDate[date]) {
        dataByDate[date] = { date, income: 0, expense: 0 };
      }
      dataByDate[date].income += item.amount;
    });
    
    expenseData.forEach(item => {
      const date = dayjs(item.date).format('DD.MM');
      if (!dataByDate[date]) {
        dataByDate[date] = { date, income: 0, expense: 0 };
      }
      dataByDate[date].expense += item.amount;
    });
    
    return Object.values(dataByDate).sort((a, b) => a.date.localeCompare(b.date));
  }, [incomeData, expenseData]);

  const totalIncome = incomeData?.reduce((sum, item) => sum + item.amount, 0) || 0;
  const totalExpense = expenseData?.reduce((sum, item) => sum + item.amount, 0) || 0;
  const netProfit = totalIncome - totalExpense;

  if (isLoading) {
    return (
      <div className="incomeExpenseLoading">
        <Spin size="large" />
      </div>
    );
  }

  const handleQuickSelect = (type: string) => {
    const today = dayjs();
    let start: Dayjs, end: Dayjs;

    switch (type) {
      case 'thisWeek':
        start = today.startOf('week');
        end = today.endOf('week');
        break;
      case 'thisMonth':
        start = today.startOf('month');
        end = today.endOf('month');
        break;
      case 'lastMonth':
        start = today.subtract(1, 'month').startOf('month');
        end = today.subtract(1, 'month').endOf('month');
        break;
      case 'thisYear':
        start = today.startOf('year');
        end = today.endOf('year');
        break;
      default:
        return;
    }
    setDateRange([start, end]);
  };

  const handleAddTransaction = async () => {
    try {
      const values = await form.validateFields();
      const data = {
        date: values.date.format('YYYY-MM-DD'),
        description: values.description,
        amount: values.amount,
      };

      if (addType === 'income') {
        await addIncome(data);
        message.success('Доход успешно добавлен');
      } else {
        await addExpense(data);
        message.success('Расход успешно добавлен');
      }

      // Обновляем данные
      queryClient.invalidateQueries({ queryKey: ['income-detail'] });
      queryClient.invalidateQueries({ queryKey: ['expense-detail'] });
      
      setAddModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('Error adding transaction:', error);
      message.error('Ошибка при добавлении записи');
    }
  };

  const openAddModal = (type: 'income' | 'expense') => {
    setAddType(type);
    form.setFieldsValue({
      date: dayjs(),
    });
    setAddModalVisible(true);
  };

  const handleRowClick = (record: any) => {
    setSelectedRecord(record);
    setDetailModalVisible(true);
  };

  const handleDelete = async () => {
    if (!selectedRecord || !selectedRecord.can_delete) return;
    
    try {
      const endpoint = selectedRecord.type === 'income' 
        ? `/director/finance/income/${selectedRecord.id}/`
        : `/director/finance/expense/${selectedRecord.id}/`;
      
      await apiClient.delete(endpoint);
      message.success('Запись успешно удалена');
      
      // Обновляем данные
      queryClient.invalidateQueries({ queryKey: ['income-detail'] });
      queryClient.invalidateQueries({ queryKey: ['expense-detail'] });
      
      setDetailModalVisible(false);
      setSelectedRecord(null);
    } catch (error) {
      console.error('Error deleting transaction:', error);
      message.error('Ошибка при удалении записи');
    }
  };

  return (
    <div>
      <Card
        className={[
          'incomeExpenseFiltersCard',
          isMobile ? 'incomeExpenseFiltersCardMobile' : '',
        ].filter(Boolean).join(' ')}
      >
        {isMobile ? (
          <div className={mobileStyles.datePickerContainer}>
            <RangePicker
              value={dateRange}
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  setDateRange([dates[0], dates[1]]);
                }
              }}
              format="DD.MM.YYYY"
              className={mobileStyles.mobileRangePicker}
              size="large"
              getPopupContainer={(trigger) => trigger.parentElement || document.body}
            />
            <Row gutter={[8, 8]} className={mobileStyles.quickSelectButtons}>
              <Col span={12}>
                <Button 
                  onClick={() => handleQuickSelect('thisWeek')}
                  className={mobileStyles.quickSelectButton}
                >
                  Эта неделя
                </Button>
              </Col>
              <Col span={12}>
                <Button 
                  onClick={() => handleQuickSelect('thisMonth')}
                  className={mobileStyles.quickSelectButton}
                >
                  Этот месяц
                </Button>
              </Col>
              <Col span={12}>
                <Button 
                  onClick={() => handleQuickSelect('lastMonth')}
                  className={mobileStyles.quickSelectButton}
                >
                  Прошлый месяц
                </Button>
              </Col>
              <Col span={12}>
                <Button 
                  onClick={() => handleQuickSelect('thisYear')}
                  className={mobileStyles.quickSelectButton}
                >
                  Этот год
                </Button>
              </Col>
            </Row>
          </div>
        ) : (
          <Space wrap size="middle">
            <RangePicker
              value={dateRange}
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  setDateRange([dates[0], dates[1]]);
                }
              }}
              format="DD.MM.YYYY"
            />
            <Button onClick={() => handleQuickSelect('thisWeek')}>Эта неделя</Button>
            <Button onClick={() => handleQuickSelect('thisMonth')}>Этот месяц</Button>
            <Button onClick={() => handleQuickSelect('lastMonth')}>Прошлый месяц</Button>
            <Button onClick={() => handleQuickSelect('thisYear')}>Этот год</Button>
          </Space>
        )}
      </Card>

      {/* Кнопки добавления */}
      <Card style={{ marginTop: 16 }}>
        <Space wrap>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => openAddModal('income')}
            style={{ background: '#52c41a', borderColor: '#52c41a' }}
          >
            Добавить доход
          </Button>
          <Button 
            type="primary" 
            danger
            icon={<PlusOutlined />}
            onClick={() => openAddModal('expense')}
          >
            Добавить расход
          </Button>
        </Space>
      </Card>

      <Row gutter={[16, isMobile ? 12 : 16]} className="incomeExpenseStatsRow">
        <Col xs={24} sm={12} md={8}>
          <Card
            className={[
              'incomeExpenseStatCard',
              isMobile ? 'incomeExpenseStatCardMobile' : '',
            ].filter(Boolean).join(' ')}
          >
            <Statistic
              title="Общий доход"
              value={totalIncome}
              prefix="₽"
              precision={0}
              className={[
                'incomeExpenseIncomeStatistic',
                isMobile ? 'incomeExpenseIncomeStatisticMobile' : '',
              ].filter(Boolean).join(' ')}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card
            className={[
              'incomeExpenseStatCard',
              isMobile ? 'incomeExpenseStatCardMobile' : '',
            ].filter(Boolean).join(' ')}
          >
            <Statistic
              title="Общие расходы"
              value={totalExpense}
              prefix="₽"
              precision={0}
              className={[
                'incomeExpenseExpenseStatistic',
                isMobile ? 'incomeExpenseExpenseStatisticMobile' : '',
              ].filter(Boolean).join(' ')}
            />
          </Card>
        </Col>
        <Col xs={24} sm={24} md={8}>
          <Card
            className={[
              'incomeExpenseStatCard',
              'incomeExpenseHighlightCard',
              isMobile ? 'incomeExpenseStatCardMobile' : '',
              isMobile ? 'incomeExpenseHighlightCardMobile' : '',
            ].filter(Boolean).join(' ')}
          >
            <Statistic
              title="Чистая прибыль"
              value={netProfit}
              prefix="₽"
              precision={0}
              className={[
                'incomeExpenseNetStatistic',
                isMobile ? 'incomeExpenseNetStatisticMobile' : '',
              ].filter(Boolean).join(' ')}
            />
          </Card>
        </Col>
      </Row>

      <Card 
        title="Доходы и расходы"
        className={[
          'incomeExpenseChartCard',
          isMobile ? 'incomeExpenseChartCardMobile' : '',
        ].filter(Boolean).join(' ')}
      >
        {chartData.length > 0 ? (
          <div
            className={[
              'incomeExpenseChartContainer',
              isMobile ? 'incomeExpenseChartContainerMobile' : '',
            ].filter(Boolean).join(' ')}
            style={{ minHeight: 300 }}
          >
            <ResponsiveContainer width="100%" height="100%" minHeight={300} key={`${dateRange[0].format('YYYY-MM-DD')}-${dateRange[1].format('YYYY-MM-DD')}`}>
              <BarChart 
                data={chartData}
                margin={{
                  top: 20,
                  right: isMobile ? 10 : 30,
                  left: isMobile ? 10 : 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  fontSize={isMobile ? 10 : 12}
                  interval={isMobile ? 1 : 0}
                />
                <YAxis 
                  fontSize={isMobile ? 10 : 12}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                formatter={(value: number) => `${value.toLocaleString('ru-RU')} ₽`}
              />
              <Legend />
              <Bar dataKey="income" fill="#52c41a" name="Доход" />
              <Bar dataKey="expense" fill="#ff4d4f" name="Расход" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>
            <p style={{ fontSize: 16, marginBottom: 8 }}>📊 Нет данных за выбранный период</p>
            <p style={{ fontSize: 14 }}>Выберите другой период или дождитесь появления транзакций</p>
          </div>
        )}
      </Card>

      {/* Объединенная таблица доходов и расходов */}
      <Card 
        title="Детализация операций"
        className={[
          'incomeExpenseTableCard',
          isMobile ? 'incomeExpenseTableCardMobile' : '',
        ].filter(Boolean).join(' ')}
        style={{ marginTop: 16 }}
        extra={
          <Select
            value={tableFilter}
            onChange={setTableFilter}
            style={{ width: 120 }}
          >
            <Option value="all">Все</Option>
            <Option value="income">Доходы</Option>
            <Option value="expense">Расходы</Option>
          </Select>
        }
      >
        <Table
          dataSource={(() => {
            const allTransactions = [
              ...(incomeData || []).map(item => ({ 
                ...item, 
                type: 'income' as const,
                created_at: (item as any).created_at || item.date 
              })),
              ...(expenseData || []).map(item => ({ 
                ...item, 
                type: 'expense' as const,
                created_at: (item as any).created_at || item.date 
              }))
            ];
            
            // Сортируем по created_at (новые сверху)
            allTransactions.sort((a, b) => {
              const dateA = new Date(a.created_at || a.date).getTime();
              const dateB = new Date(b.created_at || b.date).getTime();
              return dateB - dateA;
            });
            
            if (tableFilter === 'income') {
              return allTransactions.filter(item => item.type === 'income');
            }
            if (tableFilter === 'expense') {
              return allTransactions.filter(item => item.type === 'expense');
            }
            return allTransactions;
          })()}
          rowKey={(record, index) => `${record.type}-${record.id || record.date}-${index}`}
          pagination={{ pageSize: 15 }}
          scroll={{ x: isMobile ? 800 : undefined }}
          onRow={(record) => ({
            onClick: () => handleRowClick(record),
            style: { cursor: record.can_delete ? 'pointer' : 'default' }
          })}
          columns={[
            {
              title: 'Дата',
              dataIndex: 'date',
              key: 'date',
              render: (date: string) => dayjs(date).format('DD.MM.YYYY'),
              sorter: (a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf(),
              defaultSortOrder: 'descend' as const,
            },
            {
              title: 'Тип',
              dataIndex: 'type',
              key: 'type',
              render: (type: 'income' | 'expense') => (
                <Tag color={type === 'income' ? 'green' : 'red'}>
                  {type === 'income' ? 'Доход' : 'Расход'}
                </Tag>
              ),
              filters: [
                { text: 'Доходы', value: 'income' },
                { text: 'Расходы', value: 'expense' },
              ],
              onFilter: (value, record) => record.type === value,
            },
            {
              title: 'Описание',
              dataIndex: 'description',
              key: 'description',
            },
            {
              title: 'Сумма',
              dataIndex: 'amount',
              key: 'amount',
              render: (amount: number, record: any) => (
                <span style={{ 
                  color: record.type === 'income' ? '#52c41a' : '#ff4d4f', 
                  fontWeight: 'bold' 
                }}>
                  {record.type === 'income' ? '+' : '-'}{amount.toLocaleString('ru-RU')} ₽
                </span>
              ),
              sorter: (a, b) => a.amount - b.amount,
            },
          ]}
          locale={{ emptyText: 'Нет операций за выбранный период' }}
        />
      </Card>

      {/* Модальное окно добавления */}
      <Modal
        title={addType === 'income' ? 'Добавить доход' : 'Добавить расход'}
        open={addModalVisible}
        onOk={handleAddTransaction}
        onCancel={() => {
          setAddModalVisible(false);
          form.resetFields();
        }}
        okText="Добавить"
        cancelText="Отмена"
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            date: dayjs(),
          }}
        >
          <Form.Item
            name="date"
            label="Дата"
            rules={[{ required: true, message: 'Выберите дату' }]}
          >
            <DatePicker 
              format="DD.MM.YYYY" 
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="Описание"
            rules={[{ required: true, message: 'Введите описание' }]}
          >
            <Input.TextArea 
              rows={3}
              placeholder="Например: Оплата за услуги хостинга"
            />
          </Form.Item>

          <Form.Item
            name="amount"
            label="Сумма (₽)"
            rules={[
              { required: true, message: 'Введите сумму' },
              { type: 'number', min: 0.01, message: 'Сумма должна быть больше 0' }
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0.01}
              precision={2}
              placeholder="0.00"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Модальное окно деталей */}
      <Modal
        title="Детали операции"
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setSelectedRecord(null);
        }}
        footer={[
          <Button key="close" onClick={() => {
            setDetailModalVisible(false);
            setSelectedRecord(null);
          }}>
            Закрыть
          </Button>,
          selectedRecord?.can_delete && (
            <Button 
              key="delete" 
              danger 
              onClick={handleDelete}
            >
              Удалить
            </Button>
          ),
        ]}
      >
        {selectedRecord && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <div>
              <Text strong>Тип:</Text>
              <br />
              <Tag color={selectedRecord.type === 'income' ? 'green' : 'red'}>
                {selectedRecord.type === 'income' ? 'Доход' : 'Расход'}
              </Tag>
            </div>
            <div>
              <Text strong>Дата:</Text>
              <br />
              <Text>{dayjs(selectedRecord.date).format('DD.MM.YYYY')}</Text>
            </div>
            <div>
              <Text strong>Описание:</Text>
              <br />
              <Text>{selectedRecord.description}</Text>
            </div>
            <div>
              <Text strong>Сумма:</Text>
              <br />
              <Text 
                style={{ 
                  color: selectedRecord.type === 'income' ? '#52c41a' : '#ff4d4f',
                  fontSize: 18,
                  fontWeight: 'bold'
                }}
              >
                {selectedRecord.type === 'income' ? '+' : '-'}
                {selectedRecord.amount.toLocaleString('ru-RU')} ₽
              </Text>
            </div>
            {selectedRecord.created_at && (
              <div>
                <Text strong>Создано:</Text>
                <br />
                <Text type="secondary">
                  {dayjs(selectedRecord.created_at).format('DD.MM.YYYY HH:mm')}
                </Text>
              </div>
            )}
            {!selectedRecord.can_delete && (
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  * Автоматически созданные записи нельзя удалить
                </Text>
              </div>
            )}
          </Space>
        )}
      </Modal>
    </div>
  );
};

export default IncomeExpenseDetail;
