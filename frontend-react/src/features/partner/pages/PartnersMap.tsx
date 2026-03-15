import React, { useState, useEffect, useRef } from 'react';
import { Card, Spin, Alert, Select, Typography, Space, Tag, Button, Modal, Row, Col } from 'antd';
import { EnvironmentOutlined, PhoneOutlined, UserOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { partnersApi } from '../api/partners';
import styles from './PartnersMap.module.css';

const { Title, Text } = Typography;
const { Option } = Select;

interface Partner {
  id: number;
  username: string;
  email: string;
  city: string;
  phone?: string;
  role: string;
  date_joined: string;
  total_referrals: number;
  active_referrals: number;
  total_earnings: number;
}

interface PartnerWithCoords extends Partner {
  coordinates?: { lat: number; lon: number };
  svgCoords?: { x: number; y: number };
  error?: string;
}

// Координаты основных городов России (в процентах от viewBox)
const CITY_COORDINATES: Record<string, { x: number; y: number }> = {
  'Москва': { x: 37, y: 32 },
  'Санкт-Петербург': { x: 30, y: 20 },
  'Новосибирск': { x: 65, y: 35 },
  'Екатеринбург': { x: 58, y: 30 },
  'Краснодар': { x: 35, y: 50 },
  'Владивосток': { x: 90, y: 55 },
  'Казань': { x: 50, y: 28 },
  'Архангельск': { x: 40, y: 15 },
  'Нижний Новгород': { x: 45, y: 30 },
  'Красноярск': { x: 70, y: 32 },
  'Самара': { x: 52, y: 35 },
  'Уфа': { x: 55, y: 35 },
  'Ростов-на-Дону': { x: 38, y: 48 },
  'Омск': { x: 68, y: 32 },
  'Челябинск': { x: 60, y: 32 }
};

const PartnersMap: React.FC = () => {
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedPartner, setSelectedPartner] = useState<PartnerWithCoords | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [partnersWithCoords, setPartnersWithCoords] = useState<PartnerWithCoords[]>([]);

  // Запрос к API
  const { data: partners, isLoading, error } = useQuery({
    queryKey: ['partners-list'],
    queryFn: () => partnersApi.getPartnersList(),
  });

  // Получение координат для партнеров
  useEffect(() => {
    if (partners && partners.length > 0) {
      const results: PartnerWithCoords[] = [];
      
      partners.forEach(partner => {
        if (!partner.city) {
          results.push({ ...partner, error: 'Город не указан' });
          return;
        }

        // Используем встроенные координаты
        const coords = CITY_COORDINATES[partner.city];
        if (coords) {
          results.push({
            ...partner,
            svgCoords: {
              x: (coords.x / 100) * 1000,
              y: (coords.y / 100) * 600
            }
          });
        } else {
          results.push({
            ...partner,
            error: 'Координаты не найдены'
          });
        }
      });
      
      setPartnersWithCoords(results);
    }
  }, [partners]);

  const filteredPartners = selectedCity 
    ? partnersWithCoords.filter(partner => partner.city === selectedCity)
    : partnersWithCoords;

  const uniqueCities = Array.from(new Set(partnersWithCoords.map(p => p.city))).sort();

  const handleMarkerClick = (partner: PartnerWithCoords) => {
    setSelectedPartner(partner);
    setModalVisible(true);
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" />
        <Text className={styles.loadingText}>Загрузка партнеров...</Text>
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Ошибка загрузки"
        description="Не удалось загрузить список партнеров"
        type="error"
        showIcon
      />
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Title level={3}>Карта партнеров России</Title>
        <div className={styles.controls}>
          <Select
            placeholder="Выберите город"
            value={selectedCity}
            onChange={setSelectedCity}
            allowClear
            className={styles.citySelect}
          >
            {uniqueCities.map(city => (
              <Option key={city} value={city}>
                {city}
              </Option>
            ))}
          </Select>
          <Tag color="blue">
            Партнеров: {filteredPartners.length}
          </Tag>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.mapContainer}>
          <Card className={styles.mapCard}>
            <div className={styles.mapWrapper}>
              <div className={styles.mapSvgContainer}>
                <svg
                  className={styles.russiaMap}
                  viewBox="0 0 1000 600"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <style>
                      {`
                        .region { 
                          fill: #e8f4f8; 
                          stroke: #2c3e50; 
                          stroke-width: 0.5; 
                          transition: all 0.3s ease; 
                          cursor: pointer;
                        }
                        .region:hover { 
                          fill: #d4edda; 
                          stroke-width: 1; 
                        }
                      `}
                    </style>
                  </defs>
                  
                  {/* Упрощенная карта России */}
                  <g id="russia-regions">
                    <path className="region" d="M50,150 L200,120 L350,140 L350,200 L200,220 L50,200 Z" />
                    <path className="region" d="M200,120 L400,100 L550,120 L550,180 L400,200 L350,140 Z" />
                    <path className="region" d="M400,100 L650,80 L800,100 L800,160 L650,180 L550,120 Z" />
                    <path className="region" d="M650,80 L850,60 L950,80 L950,140 L850,160 L800,100 Z" />
                    <path className="region" d="M50,200 L200,220 L350,200 L350,280 L200,300 L50,280 Z" />
                    <path className="region" d="M200,220 L400,200 L550,180 L550,260 L400,280 L350,200 Z" />
                    <path className="region" d="M400,200 L650,180 L800,160 L800,240 L650,260 L550,180 Z" />
                    <path className="region" d="M650,180 L850,160 L950,140 L950,220 L850,240 L800,160 Z" />
                    <path className="region" d="M50,280 L200,300 L350,280 L350,360 L200,380 L50,360 Z" />
                    <path className="region" d="M200,300 L400,280 L550,260 L550,340 L400,360 L350,280 Z" />
                    <path className="region" d="M400,280 L650,260 L800,240 L800,320 L650,340 L550,260 Z" />
                    <path className="region" d="M650,260 L850,240 L950,220 L950,300 L850,320 L800,240 Z" />
                    <path className="region" d="M50,360 L200,380 L350,360 L350,450 L200,450 L50,450 Z" />
                    <path className="region" d="M200,380 L400,360 L550,340 L550,420 L400,450 L350,360 Z" />
                    <path className="region" d="M400,360 L650,340 L800,320 L800,400 L650,420 L550,340 Z" />
                    <path className="region" d="M650,340 L850,320 L950,300 L950,380 L850,400 L800,320 Z" />
                    <path className="region" d="M800,400 L950,380 L950,450 L800,450 Z" />
                  </g>
                </svg>
                
                {/* Маркеры партнеров */}
                <div className={styles.markersOverlay}>
                  {filteredPartners.map(partner => {
                    if (!partner.svgCoords) return null;
                    
                    return (
                      <div
                        key={partner.id}
                        className={styles.marker}
                        style={{
                          left: `${(partner.svgCoords.x / 1000) * 100}%`,
                          top: `${(partner.svgCoords.y / 600) * 100}%`,
                        }}
                        onClick={() => handleMarkerClick(partner)}
                        title={`${partner.username} - ${partner.city}`}
                      >
                        <div className={styles.markerDot} />
                        <div className={styles.markerLabel}>
                          {partner.city}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className={styles.sidebar}>
          <Card title="Список партнеров" className={styles.partnersCard}>
            <div className={styles.partnersList}>
              {filteredPartners.map(partner => (
                <Card
                  key={partner.id}
                  size="small"
                  className={styles.partnerCard}
                  onClick={() => handleMarkerClick(partner)}
                  hoverable
                >
                  <div className={styles.partnerInfo}>
                    <Title level={5} className={styles.partnerName}>
                      {partner.username}
                    </Title>
                    <Space direction="vertical" size="small">
                      <Text>
                        <EnvironmentOutlined /> {partner.city}
                      </Text>
                      <Text>
                        <UserOutlined /> Рефералов: {partner.total_referrals}
                      </Text>
                      <Text type="success">
                        Доход: {partner.total_earnings.toLocaleString('ru-RU')} ₽
                      </Text>
                      {partner.error && (
                        <Text type="danger" className={styles.errorText}>
                          {partner.error}
                        </Text>
                      )}
                    </Space>
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Модальное окно с информацией о партнере */}
      <Modal
        title={selectedPartner?.username}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setModalVisible(false)}>
            Закрыть
          </Button>
        ]}
        width={600}
      >
        {selectedPartner && (
          <div className={styles.partnerDetails}>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Space direction="vertical" size="middle">
                  <div>
                    <Text strong>Город:</Text>
                    <br />
                    <Text>{selectedPartner.city}</Text>
                  </div>
                  <div>
                    <Text strong>Email:</Text>
                    <br />
                    <Text>{selectedPartner.email}</Text>
                  </div>
                  {selectedPartner.phone && (
                    <div>
                      <Text strong>Телефон:</Text>
                      <br />
                      <Text>
                        <PhoneOutlined /> {selectedPartner.phone}
                      </Text>
                    </div>
                  )}
                </Space>
              </Col>
              <Col span={12}>
                <Space direction="vertical" size="middle">
                  <div>
                    <Text strong>Всего рефералов:</Text>
                    <br />
                    <Text>{selectedPartner.total_referrals}</Text>
                  </div>
                  <div>
                    <Text strong>Активных рефералов:</Text>
                    <br />
                    <Text>{selectedPartner.active_referrals}</Text>
                  </div>
                  <div>
                    <Text strong>Общий доход:</Text>
                    <br />
                    <Text type="success">
                      {selectedPartner.total_earnings.toLocaleString('ru-RU')} ₽
                    </Text>
                  </div>
                </Space>
              </Col>
            </Row>
            <div className={styles.partnerStats}>
              <Text strong>Дата регистрации:</Text>
              <br />
              <Text>{new Date(selectedPartner.date_joined).toLocaleDateString('ru-RU')}</Text>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PartnersMap;