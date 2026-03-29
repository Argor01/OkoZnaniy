import React from 'react';
import { Card, Typography, Row, Col, Button, Space, Tag, message } from 'antd';
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
}

export const PartnerProgram: React.FC<PartnerProgramProps> = ({
  referralLink = "https://okoznaniy.ru/ref/ABC123"
}) => {
  
  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    message.success('Ссылка скопирована в буфер обмена');
  };

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
          <Col xs={24} md={12}>
            <div className={styles.promotionMethod}>
              <TeamOutlined className={`${styles.promotionIcon} ${styles.promotionIconBlue}`} />
              <Paragraph className={styles.promotionText}>
                <strong>Работайте вместе</strong> с вашим персональным менеджером
              </Paragraph>
            </div>
          </Col>
          <Col xs={24} md={12}>
            <div className={styles.promotionMethod}>
              <GlobalOutlined className={`${styles.promotionIcon} ${styles.promotionIconGreen}`} />
              <Paragraph className={styles.promotionText}>
                <strong>Размещайтесь</strong> на платных и бесплатных досках объявлений и в социальных сетях
              </Paragraph>
            </div>
          </Col>
        </Row>
        <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
          <Col xs={24} md={12}>
            <div className={styles.promotionMethod}>
              <FileImageOutlined className={`${styles.promotionIcon} ${styles.promotionIconOrange}`} />
              <Paragraph className={styles.promotionText}>
                <strong>Используйте конверсионные</strong> баннеры, лендинги, виджеты
              </Paragraph>
            </div>
          </Col>
          <Col xs={24} md={12}>
            <div className={styles.promotionMethod}>
              <TrophyOutlined className={`${styles.promotionIcon} ${styles.promotionIconPurple}`} />
              <Paragraph className={styles.promotionText}>
                <strong>Привлекайте заказчиков</strong> через площадки Авито, Яндекс Услуги
              </Paragraph>
            </div>
          </Col>
        </Row>
        <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
          <Col xs={24} md={12}>
            <div className={styles.promotionMethod}>
              <GlobalOutlined className={`${styles.promotionIcon} ${styles.promotionIconPink}`} />
              <Paragraph className={styles.promotionText}>
                <strong>Берите контроль</strong> над учебными заведениями в вашем городе и размещайте объявления (группы студентов, подслушано, признавашки)
              </Paragraph>
            </div>
          </Col>
          <Col xs={24} md={12}>
            <div className={styles.promotionMethod}>
              <TeamOutlined className={`${styles.promotionIcon} ${styles.promotionIconBlue}`} />
              <Paragraph className={styles.promotionText}>
                <strong>Привлекайте заказчиков</strong> на наш ресурс через свою партнёрскую ссылку
              </Paragraph>
            </div>
          </Col>
        </Row>
        <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
          <Col xs={24} md={12}>
            <div className={styles.promotionMethod}>
              <TrophyOutlined className={`${styles.promotionIcon} ${styles.promotionIconGreen}`} />
              <Paragraph className={styles.promotionText}>
                <strong>Увеличивайте базу партнёров</strong> и получайте дополнительные бонусы
              </Paragraph>
            </div>
          </Col>
          <Col xs={24} md={12}>
            <div className={styles.promotionMethod}>
              <DollarOutlined className={`${styles.promotionIcon} ${styles.promotionIconOrange}`} />
              <Paragraph className={styles.promotionText}>
                <strong>Зарабатывайте с каждого заказа</strong> ваших заказчиков
              </Paragraph>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Условия выплат */}
      <Card className={styles.partnerProgramCard}>
        <Title level={4}>Партнерские выплаты</Title>
        <Paragraph>
          Привлекайте клиентов через свою партнёрскую ссылку и получайте 25% с каждой покупки работы
        </Paragraph>
        
        <Title level={5} style={{ marginTop: '24px' }}>Условия партнерских выплат</Title>
        
        <Row gutter={[24, 16]} style={{ marginTop: '16px' }}>
          <Col xs={24} lg={24}>
            <Card size="small" style={{ height: '100%' }}>
              <div style={{ textAlign: 'center' }}>
                <Title level={4} style={{ color: '#1890ff', margin: '0 0 8px 0' }}>
                  Партнерская комиссия
                </Title>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1890ff' }}>25%</div>
                <Text type="secondary">с каждой покупки работы клиентом</Text>
              </div>
            </Card>
          </Col>
        </Row>

        <table className={styles.paymentTable}>
          <thead>
            <tr className={styles.paymentTableHeader}>
              <th className={styles.paymentTableHeaderCell}>
                Условия выплат
              </th>
              <th className={styles.paymentTableHeaderCellCenter}>
                Размер комиссии
              </th>
              <th className={styles.paymentTableHeaderCellCenter}>
                Период действия
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className={styles.paymentTableRow}>
              <td className={styles.paymentTableCell}>Комиссия с покупки работы</td>
              <td className={`${styles.paymentTableCellCenter} ${styles.paymentTableCellCustomers}`}>25%</td>
              <td className={styles.paymentTableCellCenter}>6 месяцев</td>
            </tr>
            <tr className={styles.paymentTableRow}>
              <td className={styles.paymentTableCell}>Выплаты по повторным заказам</td>
              <td className={`${styles.paymentTableCellCenter} ${styles.paymentTableCellCustomers}`}>25%</td>
              <td className={styles.paymentTableCellCenter}>6 месяцев</td>
            </tr>
            <tr>
              <td className={styles.paymentTableCell}>Время зачисления средств</td>
              <td className={styles.paymentTableCellCenter} colSpan={2}>После разблокировки средств</td>
            </tr>
          </tbody>
        </table>

        <div className={`${styles.infoBox} ${styles.infoBoxGreen}`}>
          <Text>
            <strong>Важно:</strong> Партнерские выплаты начисляются только после того, как клиент перешел по вашей реферальной ссылке и купил работу. Комиссия выплачивается со всех заказов клиента в течение 6 месяцев с момента первого перехода.
          </Text>
        </div>

        <div className={`${styles.infoBox} ${styles.infoBoxOrange}`}>
          <Text>
            <strong>Статистика:</strong> В личном кабинете вы можете отслеживать переходы по ссылке, количество заказанных работ, доход и ожидаемый доход (работы на выполнении и доработке).
          </Text>
        </div>
      </Card>
    </div>
  );
};