import React from 'react';
import { Card, Typography, Row, Col, Button, Space, Divider, Progress, Tag, message } from 'antd';
import { 
  CopyOutlined, 
  ShareAltOutlined, 
  DollarOutlined, 
  TeamOutlined,
  TrophyOutlined,
  LinkOutlined,
  FileImageOutlined,
  GlobalOutlined
} from '@ant-design/icons';
import styles from './PartnerProgram.module.css';

const { Title, Text, Paragraph } = Typography;

interface PartnerProgramProps {
  referralLink?: string;
  currentEarnings?: number;
  nextBonusThreshold?: number;
}

export const PartnerProgram: React.FC<PartnerProgramProps> = ({
  referralLink = "https://studwork.org/ref/ABC123",
  currentEarnings = 0,
  nextBonusThreshold = 10000
}) => {
  
  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    message.success('Ссылка скопирована в буфер обмена');
  };

  const bonusProgress = (currentEarnings / nextBonusThreshold) * 100;
  const remainingToBonus = nextBonusThreshold - currentEarnings;

  return (
    <div className={styles.partnerProgramContainer}>
      {/* Заголовок и описание */}
      <Card className={styles.partnerProgramCard}>
        <Title level={2} className={styles.partnerProgramTitle}>
          Партнёрская программа
        </Title>
        <Paragraph className={styles.partnerProgramDescription}>
          Наша партнёрская программа помогает всем желающим монетизировать образовательный трафик
        </Paragraph>
      </Card>

      {/* Партнерская ссылка */}
      <Card className={styles.partnerProgramCard}>
        <Title level={4}>
          <LinkOutlined /> Партнёрская ссылка
        </Title>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div className={styles.referralLinkContainer}>
            <div className={styles.referralLinkBox}>
              {referralLink}
            </div>
            <Button 
              type="primary" 
              icon={<CopyOutlined />}
              onClick={copyReferralLink}
            >
              Скопировать ссылку
            </Button>
          </div>
          <Text type="secondary">
            Поделитесь ссылкой в соцсетях: <Tag color="blue">0</Tag>
          </Text>
        </Space>
      </Card>

      {/* Способы продвижения */}
      <Card className={styles.partnerProgramCard}>
        <Title level={4}>
          <ShareAltOutlined /> Как продвигать
        </Title>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <div className={styles.promotionMethod}>
              <GlobalOutlined className={`${styles.promotionIcon} ${styles.promotionIconBlue}`} />
              <Paragraph className={styles.promotionText}>
                <strong>Рекомендуйте Студворк</strong> в соцсетях, личном блоге или на сайте
              </Paragraph>
            </div>
          </Col>
          <Col xs={24} md={8}>
            <div className={styles.promotionMethod}>
              <FileImageOutlined className={`${styles.promotionIcon} ${styles.promotionIconGreen}`} />
              <Paragraph className={styles.promotionText}>
                <strong>Используйте конверсионные</strong> баннеры, лендинги, виджеты
              </Paragraph>
            </div>
          </Col>
          <Col xs={24} md={8}>
            <div className={styles.promotionMethod}>
              <TeamOutlined className={`${styles.promotionIcon} ${styles.promotionIconOrange}`} />
              <Paragraph className={styles.promotionText}>
                <strong>Привлекайте заказчиков и исполнителей</strong> на наш ресурс через свою партнёрскую ссылку
              </Paragraph>
            </div>
          </Col>
        </Row>
        <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
          <Col xs={24} md={12}>
            <div className={styles.promotionMethod}>
              <TrophyOutlined className={`${styles.promotionIcon} ${styles.promotionIconPink}`} />
              <Paragraph className={styles.promotionText}>
                <strong>Увеличивайте базу партнёров</strong> и получайте дополнительные бонусы
              </Paragraph>
            </div>
          </Col>
          <Col xs={24} md={12}>
            <div className={styles.promotionMethod}>
              <DollarOutlined className={`${styles.promotionIcon} ${styles.promotionIconPurple}`} />
              <Paragraph className={styles.promotionText}>
                <strong>Зарабатывайте с каждого заказа</strong> ваших исполнителей и заказчиков
              </Paragraph>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Условия выплат */}
      <Card className={styles.partnerProgramCard}>
        <Title level={4}>Выплаты и отчисления с заказчиков и исполнителей</Title>
        <Paragraph>
          Привлекайте заказчиков и исполнителей на наш ресурс через свою партнёрскую ссылку и зарабатывайте с каждого их заказа
        </Paragraph>
        
        <Title level={5} style={{ marginTop: '24px' }}>Виды и условия выплат и отчислений</Title>
        
        <Row gutter={[24, 16]} style={{ marginTop: '16px' }}>
          <Col xs={24} lg={12}>
            <Card size="small" style={{ height: '100%' }}>
              <div style={{ textAlign: 'center' }}>
                <Title level={4} style={{ color: '#1890ff', margin: '0 0 8px 0' }}>
                  С заказчиков
                </Title>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1890ff' }}>25%</div>
              </div>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card size="small" style={{ height: '100%' }}>
              <div style={{ textAlign: 'center' }}>
                <Title level={4} style={{ color: '#52c41a', margin: '0 0 8px 0' }}>
                  С исполнителей
                </Title>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#52c41a' }}>5%</div>
              </div>
            </Card>
          </Col>
        </Row>

        <table className={styles.paymentTable}>
          <thead>
            <tr className={styles.paymentTableHeader}>
              <th className={styles.paymentTableHeaderCell}>
                Виды и условия выплат и отчислений
              </th>
              <th className={styles.paymentTableHeaderCellCenter}>
                С заказчиков
              </th>
              <th className={styles.paymentTableHeaderCellCenter}>
                С исполнителей
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className={styles.paymentTableRow}>
              <td className={styles.paymentTableCell}>Отчисления от суммы каждого заказа</td>
              <td className={`${styles.paymentTableCellCenter} ${styles.paymentTableCellCustomers}`}>25%</td>
              <td className={`${styles.paymentTableCellCenter} ${styles.paymentTableCellExecutors}`}>5%</td>
            </tr>
            <tr className={styles.paymentTableRow}>
              <td className={styles.paymentTableCell}>Выплаты по повторным заказам</td>
              <td className={`${styles.paymentTableCellCenter} ${styles.paymentTableCellCustomers}`}>25%</td>
              <td className={`${styles.paymentTableCellCenter} ${styles.paymentTableCellExecutors}`}>5%</td>
            </tr>
            <tr>
              <td className={styles.paymentTableCell}>Продолжительность выплат за повторные заказы</td>
              <td className={styles.paymentTableCellCenter}>Бессрочно</td>
              <td className={styles.paymentTableCellCenter}>1 год</td>
            </tr>
          </tbody>
        </table>

        <div className={`${styles.infoBox} ${styles.infoBoxGreen}`}>
          <Text>
            <strong>Важно:</strong> Если заказчик и исполнитель являются одновременно приглашенными участниками партнёрской 
            программы, то партнёрские начисления разделяются в равных частях партнёрами, пригласившими заказчика и исполнителя
          </Text>
        </div>

        <div className={`${styles.infoBox} ${styles.infoBoxOrange}`}>
          <Text>
            <strong>Промокоды:</strong> Использование промокодов в заказах никак не влияет на % партнёрских отчислений
          </Text>
        </div>
      </Card>

      {/* Бонусная программа */}
      <Card className={styles.partnerProgramCard}>
        <Title level={4}>
          <TrophyOutlined /> Бонусная программа
        </Title>
        <Paragraph style={{ fontSize: '16px' }}>
          Дополнительно выплачиваем <strong>1 000 ₽</strong> за каждые заработанные вами <strong>10 000 ₽</strong> с рефералов.
        </Paragraph>
        <Paragraph>
          Вы можете в реальном времени отследить сколько вам осталось получить с рефералов до следующей выплаты
        </Paragraph>

        <Row gutter={[24, 16]} style={{ marginTop: '24px' }}>
          <Col xs={24} md={12}>
            <Card size="small" className={styles.bonusCard}>
              <Title level={5} style={{ color: '#fa8c16', margin: '0 0 8px 0' }}>
                Текущая выплата
              </Title>
              <div className={`${styles.bonusNumber} ${styles.bonusNumberCurrent}`}>
                0
              </div>
              <Text style={{ fontSize: '16px' }}>Выплата бонусов 0</Text>
              <br />
              <Text type="secondary">Заработано с рефералов 0 ₽</Text>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card size="small" className={styles.bonusCardNext}>
              <Title level={5} style={{ color: '#52c41a', margin: '0 0 8px 0' }}>
                Следующая выплата
              </Title>
              <div className={`${styles.bonusNumber} ${styles.bonusNumberNext}`}>
                1
              </div>
              <Text style={{ fontSize: '16px' }}>Выплата бонусов 1</Text>
              <br />
              <Text type="secondary">Заработано с рефералов 10 000 ₽</Text>
            </Card>
          </Col>
        </Row>

        <div className={styles.progressContainer}>
          <Text className={styles.progressText}>
            <strong>{remainingToBonus.toLocaleString()} / {nextBonusThreshold.toLocaleString()} ₽ заработано с рефералов</strong>
          </Text>
          <Progress 
            percent={bonusProgress} 
            strokeColor="#52c41a"
            trailColor="#f0f0f0"
            style={{ marginBottom: '8px' }}
          />
          <Text className={styles.progressSubtext}>
            До следующей бонусной выплаты осталось заработать: <strong>{remainingToBonus.toLocaleString()} ₽</strong>
          </Text>
        </div>
      </Card>
    </div>
  );
};