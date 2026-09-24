import React from 'react';
import {
  Card, Row, Col, Statistic, Spin, Alert, Typography, Progress, DatePicker, Space, Button,
} from 'antd';
import type { Dayjs } from 'dayjs';
import {
  TeamOutlined,
  FileAddOutlined,
  ShoppingOutlined,
  AccountBookOutlined,
  CheckCircleOutlined,
  StopOutlined,
  UserDeleteOutlined,
  PercentageOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getClientStatistics } from '@/features/director/api/directorApi';
import styles from './ClientStatistics.module.css';

const { Text } = Typography;
const { RangePicker } = DatePicker;

const ClientStatistics: React.FC = () => {
  // Пустой период — показатели за всё время, как было раньше.
  const [range, setRange] = React.useState<[Dayjs | null, Dayjs | null] | null>(null);
  const period = {
    date_from: range?.[0] ? range[0].format('YYYY-MM-DD') : undefined,
    date_to: range?.[1] ? range[1].format('YYYY-MM-DD') : undefined,
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ['director-client-statistics', period.date_from, period.date_to],
    queryFn: () => getClientStatistics(period),
    refetchOnWindowFocus: false,
  });

  const picker = (
    <Space wrap style={{ marginBottom: 16 }}>
      <RangePicker
        value={range as never}
        onChange={(value) => setRange(value as [Dayjs | null, Dayjs | null] | null)}
        format="DD.MM.YYYY"
        allowEmpty={[true, true]}
        placeholder={['Начало периода', 'Конец периода']}
      />
      {range && (
        <Button onClick={() => setRange(null)}>За всё время</Button>
      )}
    </Space>
  );

  if (isLoading) {
    return (
      <div className={styles.container}>
        {picker}
        <div className={styles.loading}>
          <Spin size="large" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Alert
        type="error"
        showIcon
        message="Не удалось загрузить статистику клиентов"
        description="Попробуйте обновить страницу позже."
      />
    );
  }

  return (
    <div className={styles.container}>
      {picker}
      <Text type="secondary" className={styles.hint}>
        {period.date_from || period.date_to
          ? 'Показатели за выбранный период: клиенты считаются по дате регистрации, заказы — по дате создания. '
          : 'Сводные показатели по клиентам платформы за всё время. '}
        «Клиент с заказом» — пользователь с ролью «клиент», разместивший хотя бы один заказ.
      </Text>

      <Row gutter={[16, 16]} className={styles.statsRow}>
        <Col xs={24} sm={12} lg={6}>
          <Card className={styles.statCard}>
            <Statistic
              title="Зарегистрировано клиентов"
              value={data.registered_clients}
              prefix={<TeamOutlined />}
              className={styles.statisticClients}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className={styles.statCard}>
            <Statistic
              title="Клиентов разместили заказ"
              value={data.clients_with_orders}
              prefix={<FileAddOutlined />}
              className={styles.statisticWithOrders}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className={styles.statCard}>
            <Statistic
              title="Всего заказов"
              value={data.total_orders}
              prefix={<ShoppingOutlined />}
              className={styles.statisticOrders}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className={`${styles.statCard} ${styles.statCardHighlight}`}>
            <Statistic
              title="Средняя стоимость заказа"
              value={data.average_order_value}
              prefix="₽"
              precision={0}
              className={styles.statisticAverage}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className={styles.secondaryRow}>
        <Col xs={24} lg={8}>
          <Card className={styles.statCard} title="Конверсия клиентов в заказ">
            <div className={styles.conversion}>
              <Progress
                type="dashboard"
                percent={Math.min(Number(data.conversion_rate) || 0, 100)}
                format={(percent) => `${Number(percent).toFixed(1)}%`}
                strokeColor="#6435a5"
                size={140}
              />
              <Text type="secondary" className={styles.conversionCaption}>
                {data.clients_with_orders} из {data.registered_clients} клиентов разместили заказ
              </Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={16}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Card className={styles.statCard}>
                <Statistic
                  title="Клиентов без заказов"
                  value={data.clients_without_orders}
                  prefix={<UserDeleteOutlined />}
                  className={styles.statisticNeutral}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12}>
              <Card className={styles.statCard}>
                <Statistic
                  title="Завершённых заказов"
                  value={data.completed_orders}
                  prefix={<CheckCircleOutlined />}
                  className={styles.statisticSuccess}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12}>
              <Card className={styles.statCard}>
                <Statistic
                  title="Отменённых / истёкших"
                  value={data.cancelled_orders}
                  prefix={<StopOutlined />}
                  className={styles.statisticDanger}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12}>
              <Card className={styles.statCard}>
                <Statistic
                  title="Средний чек завершённого заказа"
                  value={data.average_completed_order_value}
                  prefix="₽"
                  precision={0}
                  className={styles.statisticAverage}
                />
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className={styles.secondaryRow}>
        <Col xs={24}>
          <Card className={styles.statCard} title="Справка по показателям">
            <div className={styles.legendRow}>
              <span className={styles.legendItem}>
                <PercentageOutlined className={styles.legendIcon} />
                <Text>
                  Конверсия = клиенты с заказами / все зарегистрированные клиенты
                </Text>
              </span>
              <span className={styles.legendItem}>
                <AccountBookOutlined className={styles.legendIcon} />
                <Text>
                  Средняя стоимость заказа считается по итоговой цене заказов (с учётом скидок)
                </Text>
              </span>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ClientStatistics;
