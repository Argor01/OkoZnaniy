import React from 'react';
import { Typography, Card, Row, Col, Button } from 'antd';
import { useRouter } from 'next/router';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import {
  FileTextOutlined,
  TeamOutlined,
  SafetyOutlined,
  DollarOutlined,
} from '@ant-design/icons';

const { Title, Paragraph } = Typography;

const features = [
  {
    icon: <FileTextOutlined style={{ fontSize: 32 }} />,
    title: 'Широкий выбор предметов',
    description: 'Более 100 дисциплин и различных типов работ',
  },
  {
    icon: <TeamOutlined style={{ fontSize: 32 }} />,
    title: 'Проверенные эксперты',
    description: 'Тщательный отбор и контроль качества работ',
  },
  {
    icon: <SafetyOutlined style={{ fontSize: 32 }} />,
    title: 'Гарантия качества',
    description: 'Бесплатные правки и возврат средств',
  },
  {
    icon: <DollarOutlined style={{ fontSize: 32 }} />,
    title: 'Выгодные цены',
    description: 'Система скидок и бонусов для постоянных клиентов',
  },
];

const HomePage: React.FC = () => {
  const router = useRouter();
  const { user } = useSelector((state: RootState) => state.auth);

  return (
    <div className="home-page">
      <div className="hero-section">
        <Title>Биржа студенческих работ</Title>
        <Paragraph>
          Помогаем студентам получить качественную помощь в выполнении учебных работ
        </Paragraph>
        {!user && (
          <Button type="primary" size="large" onClick={() => router.push('/login')}>
            Начать работу
          </Button>
        )}
      </div>

      <Row gutter={[24, 24]} className="features-section">
        {features.map((feature, index) => (
          <Col xs={24} sm={12} md={6} key={index}>
            <Card className="feature-card">
              <div className="feature-icon">{feature.icon}</div>
              <Title level={4}>{feature.title}</Title>
              <Paragraph>{feature.description}</Paragraph>
            </Card>
          </Col>
        ))}
      </Row>

      <style jsx>{`
        .home-page {
          max-width: 1200px;
          margin: 0 auto;
        }
        .hero-section {
          text-align: center;
          padding: 48px 24px;
          margin-bottom: 48px;
        }
        .features-section {
          padding: 0 24px;
        }
        :global(.feature-card) {
          text-align: center;
          height: 100%;
        }
        :global(.feature-icon) {
          margin-bottom: 24px;
          color: #1890ff;
        }
      `}</style>
    </div>
  );
};

export default HomePage; 