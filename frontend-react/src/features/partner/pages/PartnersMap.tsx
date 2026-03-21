import React, { useState, useEffect } from 'react';
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

interface MapFeature {
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
  properties?: any;
}

interface MapData {
  type: string;
  features: MapFeature[];
}

// Координаты основных городов России (в процентах от viewBox SVG карты)
const CITY_COORDINATES: Record<string, { x: number; y: number }> = {
  'Москва': { x: 55.7558, y: 37.6176 },
  'Санкт-Петербург': { x: 59.9311, y: 30.3609 },
  'Новосибирск': { x: 55.0084, y: 82.9357 },
  'Екатеринбург': { x: 56.8431, y: 60.6454 },
  'Краснодар': { x: 45.0355, y: 38.9753 },
  'Владивосток': { x: 43.1056, y: 131.8735 },
  'Казань': { x: 55.8304, y: 49.0661 },
  'Архангельск': { x: 64.5401, y: 40.5433 },
  'Нижний Новгород': { x: 56.2965, y: 43.9361 },
  'Красноярск': { x: 56.0184, y: 92.8672 },
  'Самара': { x: 53.2001, y: 50.1500 },
  'Уфа': { x: 54.7388, y: 55.9721 },
  'Ростов-на-Дону': { x: 47.2357, y: 39.7015 },
  'Омск': { x: 54.9885, y: 73.3242 },
  'Челябинск': { x: 55.1644, y: 61.4368 }
};

// Функция для конвертации географических координат в SVG координаты
const convertGeoToSvg = (lat: number, lon: number): { x: number; y: number } => {
  // Границы России в географических координатах (более точные)
  const minLat = 41.2;
  const maxLat = 81.9;
  const minLon = 19.6;
  const maxLon = 169.0;
  
  // Размеры SVG viewBox
  const svgWidth = 1000;
  const svgHeight = 600;
  
  // Конвертация координат с учетом проекции Меркатора
  const x = ((lon - minLon) / (maxLon - minLon)) * svgWidth;
  const y = svgHeight - ((lat - minLat) / (maxLat - minLat)) * svgHeight;
  
  return { x: Math.max(0, Math.min(svgWidth, x)), y: Math.max(0, Math.min(svgHeight, y)) };
};

const PartnersMap: React.FC = () => {
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedPartner, setSelectedPartner] = useState<PartnerWithCoords | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [partnersWithCoords, setPartnersWithCoords] = useState<PartnerWithCoords[]>([]);
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);

  // Загрузка данных карты
  useEffect(() => {
    const loadMapData = async () => {
      try {
        setMapError(null);
        const response = await fetch('/russia-map.json');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setMapData(data);
      } catch (error) {
        console.error('Ошибка загрузки карты:', error);
        setMapError('Не удалось загрузить карту России');
      } finally {
        setMapLoading(false);
      }
    };

    loadMapData();
  }, []);

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
          const svgCoords = convertGeoToSvg(coords.x, coords.y);
          results.push({
            ...partner,
            coordinates: { lat: coords.x, lon: coords.y },
            svgCoords: svgCoords
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

  if (isLoading || mapLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" />
        <Text className={styles.loadingText}>
          {mapLoading ? 'Загрузка карты...' : 'Загрузка партнеров...'}
        </Text>
      </div>
    );
  }

  if (error || mapError) {
    return (
      <Alert
        message="Ошибка загрузки"
        description={mapError || "Не удалось загрузить список партнеров"}
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
                          stroke-width: 0.3; 
                          transition: all 0.3s ease; 
                        }
                        .region:hover { 
                          fill: #d4edda; 
                          stroke-width: 0.5; 
                        }
                      `}
                    </style>
                  </defs>
                  
                  {/* Настоящая карта России из JSON */}
                  <g id="russia-regions">
                    {mapData?.features ? (
                      mapData.features.map((feature, index) => {
                        const renderPolygon = (coordinates: number[][], polygonIndex = 0) => {
                          const pathData = coordinates.map((coord, i) => {
                            // Конвертируем географические координаты в SVG координаты
                            const svgCoord = convertGeoToSvg(coord[1], coord[0]);
                            return `${i === 0 ? 'M' : 'L'} ${svgCoord.x} ${svgCoord.y}`;
                          }).join(' ') + ' Z';
                          
                          return (
                            <path
                              key={`${index}-${polygonIndex}`}
                              className="region"
                              d={pathData}
                            />
                          );
                        };

                        if (feature.geometry.type === 'Polygon') {
                          return renderPolygon(feature.geometry.coordinates[0] as number[][]);
                        } else if (feature.geometry.type === 'MultiPolygon') {
                          return (feature.geometry.coordinates as number[][][][]).map((polygon, polygonIndex) => 
                            renderPolygon(polygon[0], polygonIndex)
                          );
                        }
                        return null;
                      })
                    ) : (
                      // Fallback: простая карта России
                      <>
                        <rect x="50" y="150" width="900" height="300" className="region" />
                        <text x="500" y="300" textAnchor="middle" fill="#666" fontSize="16">
                          Карта России
                        </text>
                      </>
                    )}
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