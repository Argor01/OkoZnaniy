import React, { useState, useEffect } from 'react';
import { Card, Spin, Alert, Select, Typography, Space, Tag, Button, Modal } from 'antd';
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
  'Челябинск': { x: 55.1644, y: 61.4368 },
  'Воронеж': { x: 51.6605, y: 39.2006 },
  'Волгоград': { x: 48.7080, y: 44.5133 },
  'Пермь': { x: 58.0105, y: 56.2502 },
  'Саратов': { x: 51.5924, y: 46.0348 },
  'Тюмень': { x: 57.1522, y: 65.5272 },
  'Тольятти': { x: 53.5303, y: 49.3461 },
  'Ижевск': { x: 56.8519, y: 53.2048 },
  'Барнаул': { x: 53.3547, y: 83.7697 },
  'Иркутск': { x: 52.2869, y: 104.3050 },
  'Хабаровск': { x: 48.4827, y: 135.0838 },
  'Ярославль': { x: 57.6261, y: 39.8845 },
  'Махачкала': { x: 42.9849, y: 47.5047 },
  'Томск': { x: 56.4977, y: 84.9744 },
  'Оренбург': { x: 51.7727, y: 55.0988 },
  'Кемерово': { x: 55.3331, y: 86.0831 },
  'Новокузнецк': { x: 53.7596, y: 87.1216 },
  'Рязань': { x: 54.6269, y: 39.6916 },
  'Астрахань': { x: 46.3497, y: 48.0408 },
  'Пенза': { x: 53.2001, y: 45.0000 },
  'Липецк': { x: 52.6103, y: 39.5708 },
  'Киров': { x: 58.6035, y: 49.6680 },
  'Чебоксары': { x: 56.1439, y: 47.2489 },
  'Калининград': { x: 54.7104, y: 20.4522 },
  'Тула': { x: 54.1961, y: 37.6182 },
  'Курск': { x: 51.7373, y: 36.1873 },
  'Ставрополь': { x: 45.0428, y: 41.9734 },
  'Сочи': { x: 43.6028, y: 39.7342 },
  'Улан-Удэ': { x: 51.8272, y: 107.6063 },
  'Тверь': { x: 56.8587, y: 35.9176 },
  'Магнитогорск': { x: 53.4078, y: 58.9796 },
  'Иваново': { x: 57.0000, y: 40.9737 },
  'Брянск': { x: 53.2521, y: 34.3717 },
  'Белгород': { x: 50.5997, y: 36.5989 },
  'Сургут': { x: 61.2500, y: 73.4167 },
  'Владимир': { x: 56.1366, y: 40.3966 },
  'Нижний Тагил': { x: 57.9197, y: 59.9650 },
  'Чита': { x: 52.0330, y: 113.5000 },
  'Смоленск': { x: 54.7818, y: 32.0401 },
  'Калуга': { x: 54.5293, y: 36.2754 },
  'Владикавказ': { x: 43.0231, y: 44.6820 },
  'Мурманск': { x: 68.9585, y: 33.0827 },
  'Якутск': { x: 62.0355, y: 129.6755 },
  'Петрозаводск': { x: 61.7849, y: 34.3469 },
  'Вологда': { x: 59.2239, y: 39.8843 },
  'Череповец': { x: 59.1333, y: 37.9000 },
  'Орёл': { x: 52.9651, y: 36.0785 },
  'Тамбов': { x: 52.7213, y: 41.4522 },
  'Кострома': { x: 57.7679, y: 40.9269 },
  'Петропавловск-Камчатский': { x: 53.0245, y: 158.6433 },
  'Южно-Сахалинск': { x: 46.9590, y: 142.7386 },
  'Грозный': { x: 43.3178, y: 45.6986 },
  'Нальчик': { x: 43.4981, y: 43.6189 },
  'Майкоп': { x: 44.6098, y: 40.1006 },
  'Симферополь': { x: 44.9521, y: 34.1024 },
  'Севастополь': { x: 44.6167, y: 33.5254 },
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

  // Запрос к API для получения реальных данных партнеров
  const { data: partners, isLoading, error } = useQuery({
    queryKey: ['partners-list'],
    queryFn: () => partnersApi.getPartnersList(),
    staleTime: 0, // Данные считаются устаревшими сразу
    refetchOnMount: true, // Обновлять при монтировании компонента
    refetchOnWindowFocus: true, // Обновлять при фокусе на окне
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
    } else {
      // Если нет данных от API, очищаем список
      setPartnersWithCoords([]);
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
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
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
              <div>
                <Text strong>Дата регистрации:</Text>
                <br />
                <Text>{new Date(selectedPartner.date_joined).toLocaleDateString('ru-RU')}</Text>
              </div>
            </Space>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PartnersMap;