import React, { useState } from 'react';
import { 
  Card, 
  Typography, 
  Row, 
  Col, 
  Button, 
  Radio, 
  Space, 
  Tabs, 
  message,
  Tooltip,
  Tag,
  Input
} from 'antd';
import { 
  DownloadOutlined, 
  FileImageOutlined,
  CopyOutlined,
  LinkOutlined
} from '@ant-design/icons';
import { useAuth } from '@/features/auth/hooks/useAuth';
import styles from './PromoMaterials.module.css';

const { Title, Text, Paragraph } = Typography;

interface BannerConfig {
  id: string;
  name: string;
  sizes: string[];
  orientations: ('horizontal' | 'vertical')[];
  designs: number[];
}

const bannerConfigs: BannerConfig[] = [
  {
    id: 'static',
    name: 'Статичный баннер',
    sizes: ['300x250', '320x50', '336x280', '468x60', '728x90', '970x90', '970x250'],
    orientations: ['horizontal', 'vertical'],
    designs: [1, 2, 3]
  }
];

export const PromoMaterials: React.FC = () => {
  const { user } = useAuth();
  const [selectedBannerType] = useState('static'); // Только статичные баннеры
  const [selectedOrientation, setSelectedOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
  const [selectedSize, setSelectedSize] = useState('970x250');
  const [selectedDesign, setSelectedDesign] = useState(1);
  const [selectedFormat, setSelectedFormat] = useState('png');

  const currentConfig = bannerConfigs.find(config => config.id === selectedBannerType);
  
  // Генерируем партнерскую ссылку
  const referralLink = user?.referral_code 
    ? `${window.location.origin}/login?ref=${user.referral_code}`
    : '';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      message.success('Скопировано в буфер обмена');
    }).catch(() => {
      message.error('Не удалось скопировать');
    });
  };

  const generateBannerUrl = () => {
    // Заглушка - в реальности здесь будет генерация URL баннера
    return `https://cdn.studwork.org/banners/${selectedBannerType}/${selectedSize}/${selectedDesign}.${selectedFormat}`;
  };

  const handleDownload = () => {
    // Заглушка - в реальности здесь будет скачивание файла
    message.success('Баннер скачан');
  };

  const renderBannerPreview = () => {
    // Заглушка баннера
    const [width, height] = selectedSize.split('x').map(Number);
    const aspectRatio = width / height;
    
    return (
      <div className={styles.bannerPreview}>
        <div 
          className={styles.bannerPlaceholder}
          style={{
            aspectRatio: aspectRatio,
            maxWidth: Math.min(width, 400),
            maxHeight: Math.min(height, 300)
          }}
        >
          <div className={styles.bannerContent}>
            <div className={styles.bannerLogo}>
              🚀 ОКОЗНАНИЙ
            </div>
            <div className={styles.bannerText}>
              Ищешь работу на дому?
            </div>
            <div className={styles.bannerButton}>
              Стать автором
            </div>
            <div className={styles.bannerSize}>
              {selectedSize}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const tabItems = [
    {
      key: 'referral-link',
      label: 'Партнерская ссылка',
      children: (
        <div>
          <Card className={styles.referralCard}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <Title level={4}>
                  <LinkOutlined /> Ваша партнерская ссылка
                </Title>
                <Paragraph type="secondary">
                  Делитесь этой ссылкой с потенциальными клиентами и исполнителями. 
                  При регистрации по вашей ссылке реферальный код будет автоматически применен.
                </Paragraph>
              </div>

              <div>
                <Text strong>Реферальный код:</Text>
                <div style={{ marginTop: 8 }}>
                  <Input
                    value={user?.referral_code || ''}
                    readOnly
                    size="large"
                    addonAfter={
                      <Button
                        type="text"
                        icon={<CopyOutlined />}
                        onClick={() => copyToClipboard(user?.referral_code || '')}
                      >
                        Копировать
                      </Button>
                    }
                  />
                </div>
              </div>

              <div>
                <Text strong>Партнерская ссылка:</Text>
                <div style={{ marginTop: 8 }}>
                  <Input
                    value={referralLink}
                    readOnly
                    size="large"
                    addonAfter={
                      <Button
                        type="text"
                        icon={<CopyOutlined />}
                        onClick={() => copyToClipboard(referralLink)}
                      >
                        Копировать
                      </Button>
                    }
                  />
                </div>
              </div>

              <div className={styles.infoBox}>
                <Title level={5}>Как это работает?</Title>
                <ul>
                  <li>Поделитесь ссылкой с друзьями, коллегами или в социальных сетях</li>
                  <li>Когда кто-то перейдет по вашей ссылке, реферальный код автоматически сохранится</li>
                  <li>При регистрации код будет автоматически применен</li>
                  <li>Вы получите комиссию с каждого заказа вашего реферала</li>
                </ul>
              </div>

              <div className={styles.statsBox}>
                <Row gutter={16}>
                  <Col span={8}>
                    <Card>
                      <div style={{ textAlign: 'center' }}>
                        <Title level={3} style={{ margin: 0 }}>
                          {user?.total_referrals || 0}
                        </Title>
                        <Text type="secondary">Всего рефералов</Text>
                      </div>
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card>
                      <div style={{ textAlign: 'center' }}>
                        <Title level={3} style={{ margin: 0 }}>
                          {user?.active_referrals || 0}
                        </Title>
                        <Text type="secondary">Активных</Text>
                      </div>
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card>
                      <div style={{ textAlign: 'center' }}>
                        <Title level={3} style={{ margin: 0 }}>
                          {user?.partner_commission_rate || 0}%
                        </Title>
                        <Text type="secondary">Ваша комиссия</Text>
                      </div>
                    </Card>
                  </Col>
                </Row>
              </div>
            </Space>
          </Card>
        </div>
      )
    },
    {
      key: 'banners',
      label: 'Баннеры',
      children: (
        <div>
          <Row gutter={[24, 24]}>
            <Col xs={24} lg={12}>
              <Card title="Настройки баннера" className={styles.configCard}>
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                  {/* Ориентация */}
                  {currentConfig && currentConfig.orientations.length > 1 && (
                    <div className={styles.configSection}>
                      <Text strong>Ориентация:</Text>
                      <Radio.Group 
                        value={selectedOrientation} 
                        onChange={(e) => setSelectedOrientation(e.target.value)}
                      >
                        <Radio value="horizontal">Горизонтальная</Radio>
                        <Radio value="vertical">Вертикальная</Radio>
                      </Radio.Group>
                    </div>
                  )}

                  {/* Размер */}
                  <div className={styles.configSection}>
                    <Text strong>Размер:</Text>
                    <div style={{ marginTop: 8 }}>
                      {currentConfig?.sizes.map(size => (
                        <Button
                          key={size}
                          type={selectedSize === size ? 'primary' : 'default'}
                          size="small"
                          onClick={() => setSelectedSize(size)}
                          style={{ margin: '2px' }}
                        >
                          {size}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Дизайн */}
                  <div className={styles.configSection}>
                    <Text strong>Дизайн:</Text>
                    <Radio.Group 
                      value={selectedDesign} 
                      onChange={(e) => setSelectedDesign(e.target.value)}
                    >
                      {currentConfig?.designs.map(design => (
                        <Radio key={design} value={design}>
                          {design}
                        </Radio>
                      ))}
                    </Radio.Group>
                  </div>

                  {/* Формат */}
                  <div className={styles.configSection}>
                    <Text strong>Формат:</Text>
                    <Radio.Group 
                      value={selectedFormat} 
                      onChange={(e) => setSelectedFormat(e.target.value)}
                    >
                      <Radio value="png">PNG</Radio>
                      <Radio value="jpg">JPG</Radio>
                    </Radio.Group>
                  </div>
                </Space>
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card title="Предварительный просмотр" className={styles.previewCard}>
                {renderBannerPreview()}
                
                <div style={{ marginTop: 16 }}>
                  <Button 
                    type="primary" 
                    icon={<DownloadOutlined />}
                    onClick={handleDownload}
                  >
                    Скачать
                  </Button>
                </div>
              </Card>
            </Col>
          </Row>
        </div>
      )
    }
  ];

  return (
    <div className={styles.promoMaterials}>
      <div className={styles.header}>
        <Title level={2}>
          <FileImageOutlined /> Промоматериалы
        </Title>
        <Paragraph>
          Используйте готовые баннеры для продвижения ОкоЗнаний 
          и увеличения количества рефералов
        </Paragraph>
      </div>

      <Tabs 
        items={tabItems}
        size="large"
        className={styles.promoTabs}
      />
    </div>
  );
};