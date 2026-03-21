import React, { useState, useEffect } from 'react';
import { Card, Spin, Alert, Select, Typography, Space, Tag, Button, Modal, Row, Col } from 'antd';
import { PhoneOutlined, UserOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { partnersApi, MapPartner } from '../api/partners';
import styles from './PartnersMap.module.css';

const { Title, Text } = Typography;
const { Option } = Select;

interface PartnerWithCoords extends MapPartner {
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

// Координаты основных городов России (географические координаты)
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
  // Границы России в географических координатах
  const minLat = 41.2;
  const maxLat = 81.9;
  const minLon = 19.6;
  const maxLon = 169.0;
  
  // Размеры SVG viewBox
  const svgWidth = 1000;
  const svgHeight = 600;
  
  // Конвертация координат
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
    } else if (!isLoading && !error) {
      // Если нет данных от API, создаем тестовые данные
      const testPartners: PartnerWithCoords[] = [
        {
          id: 1,
          username: 'Тестовый партнер 1',
          email: 'test1@example.com',
          city: 'Москва',
          phone: '+7 (999) 123-45-67',
          role: 'partner',
          date_joined: '2024-01-15',
          total_referrals: 15,
          active_referrals: 8,
          total_earnings: 45000,
          coordinates: { lat: 55.7558, lon: 37.6176 },
          svgCoords: convertGeoToSvg(55.7558, 37.6176)
        },
        {
          id: 2,
          username: 'Тестовый партнер 2',
          email: 'test2@example.com',
          city: 'Санкт-Петербург',
          phone: '+7 (999) 234-56-78',
          role: 'partner',
          date_joined: '2024-02-10',
          total_referrals: 22,
          active_referrals: 12,
          total_earnings: 67000,
          coordinates: { lat: 59.9311, lon: 30.3609 },
          svgCoords: convertGeoToSvg(59.9311, 30.3609)
        },
        {
          id: 3,
          username: 'Тестовый партнер 3',
          email: 'test3@example.com',
          city: 'Новосибирск',
          role: 'partner',
          date_joined: '2024-03-05',
          total_referrals: 9,
          active_referrals: 5,
          total_earnings: 28000,
          coordinates: { lat: 55.0084, lon: 82.9357 },
          svgCoords: convertGeoToSvg(55.0084, 82.9357)
        }
      ];
      setPartnersWithCoords(testPartners);
    }
  }, [partners, isLoading, error]);

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
    console.error('Ошибка загрузки партнеров:', error);
    return (
      <Alert
        message="Ошибка загрузки"
        description={
          mapError || (error instanceof Error 
            ? `Не удалось загрузить список партнеров: ${error.message}` 
            : "Не удалось загрузить список партнеров")
        }
        type="error"
        showIcon
        action={
          <Button size="small" onClick={() => window.location.reload()}>
            Обновить страницу
          </Button>
        }
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
            showSearch
            filterOption={(input, option) =>
              String(option?.children || '').toLowerCase().includes(input.toLowerCase())
            }
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

      {partnersWithCoords.length === 0 ? (
        <Alert
          message="Нет данных"
          description="В системе пока нет партнеров с указанными городами"
          type="info"
          showIcon
        />
      ) : (
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
                {filteredPartners.length === 0 ? (
                  <div className={styles.emptyState}>
                    <div className={styles.emptyStateIcon}>⚠</div>
                    <Text className={styles.emptyStateText}>
                      {selectedCity 
                        ? `Нет партнеров в городе ${selectedCity}` 
                        : 'Нет партнеров для отображения'
                      }
                    </Text>
                    <Text className={styles.emptyStateSubtext}>
                      {selectedCity 
                        ? 'Попробуйте выбрать другой город или сбросить фильтр'
                        : 'Партнеры появятся здесь после регистрации'
                      }
                    </Text>
                  </div>
                ) : (
                  filteredPartners.map(partner => (
                    <Card
                      key={partner.id}
                      size="small"
                      className={styles.partnerCard}
                      onClick={() => handleMarkerClick(partner)}
                      hoverable
                    >
                      <div className={styles.partnerInfo} style={{ background: '#ffffff', padding: '16px' }}>
                        <Title 
                          level={5} 
                          className={styles.partnerName}
                          style={{ 
                            color: '#1f2937 !important', 
                            fontWeight: 600, 
                            fontSize: '16px',
                            marginBottom: '8px'
                          }}
                        >
                          {partner.username}
                        </Title>
                        <div 
                          className={styles.partnerCity}
                          style={{ 
                            color: '#ffffff !important',
                            background: 'linear-gradient(135deg, #2b9fe6 0%, #238ce2 100%)',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            marginBottom: '8px',
                            display: 'inline-block'
                          }}
                        >
                          {partner.city}
                        </div>
                        <Space direction="vertical" size="small" style={{ width: '100%' }}>
                          <div className={styles.partnerStat} style={{ color: '#374151' }}>
                            <span className={styles.partnerStatIcon} style={{ color: '#2b9fe6' }}>
                              <UserOutlined />
                            </span>
                            <span style={{ color: '#374151' }}>Рефералов: </span>
                            <span 
                              className={styles.partnerStatValue}
                              style={{ color: '#1f2937', fontWeight: 600 }}
                            >
                              {partner.total_referrals}
                            </span>
                          </div>
                          <div className={styles.partnerStat} style={{ color: '#374151' }}>
                            <span className={styles.partnerStatIcon} style={{ color: '#2b9fe6' }}>
                              <UserOutlined />
                            </span>
                            <span style={{ color: '#374151' }}>Активных: </span>
                            <span 
                              className={styles.partnerStatValue}
                              style={{ color: '#1f2937', fontWeight: 600 }}
                            >
                              {partner.active_referrals}
                            </span>
                          </div>
                          <div 
                            className={styles.partnerEarnings}
                            style={{ 
                              color: '#ffffff !important',
                              background: 'linear-gradient(135deg, #2b9fe6 0%, #238ce2 100%)',
                              padding: '8px 16px',
                              borderRadius: '4px',
                              textAlign: 'center',
                              marginTop: '8px'
                            }}
                          >
                            {partner.total_earnings.toLocaleString('ru-RU')} ₽
                          </div>
                          {partner.error && (
                            <Text type="danger" className={styles.errorText}>
                              {partner.error}
                            </Text>
                          )}
                        </Space>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

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