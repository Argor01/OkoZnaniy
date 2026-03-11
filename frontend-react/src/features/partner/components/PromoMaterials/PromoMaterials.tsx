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
  Image, 
  message,
  Tooltip,
  Tag,
  Input
} from 'antd';
import { 
  DownloadOutlined, 
  CopyOutlined, 
  FileImageOutlined,
  LinkOutlined,
  CodeOutlined
} from '@ant-design/icons';
import styles from './PromoMaterials.module.css';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

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
  const [selectedBannerType] = useState('static'); // Только статичные баннеры
  const [selectedOrientation, setSelectedOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
  const [selectedSize, setSelectedSize] = useState('970x250');
  const [selectedDesign, setSelectedDesign] = useState(1);
  const [selectedFormat, setSelectedFormat] = useState('png');
  const [referralLink] = useState('https://studwork.org/ref/ABC123');

  const currentConfig = bannerConfigs.find(config => config.id === selectedBannerType);

  const generateBannerUrl = () => {
    // Заглушка - в реальности здесь будет генерация URL баннера
    return `https://cdn.studwork.org/banners/${selectedBannerType}/${selectedSize}/${selectedDesign}.${selectedFormat}`;
  };

  const generateEmbedCode = () => {
    const bannerUrl = generateBannerUrl();
    return `<a href="${referralLink}"><img src="${bannerUrl}" alt="Студворк - интернет-сервис помощи студентам" /></a>`;
  };

  const handleDownload = () => {
    // Заглушка - в реальности здесь будет скачивание файла
    message.success('Баннер скачан');
  };

  const handleCopyCode = () => {
    const code = generateEmbedCode();
    navigator.clipboard.writeText(code);
    message.success('HTML код скопирован в буфер обмена');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    message.success('Реферальная ссылка скопирована');
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
              🚀 СТУДВОРК
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
                        style={{ marginTop: 12 }}
                      >
                        <Radio value="horizontal">Горизонтальная</Radio>
                        <Radio value="vertical">Вертикальная</Radio>
                      </Radio.Group>
                    </div>
                  )}

                  {/* Размер */}
                  <div>
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
                      style={{ marginTop: 12 }}
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
                      style={{ marginTop: 12 }}
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
                  <Space>
                    <Button 
                      type="primary" 
                      icon={<DownloadOutlined />}
                      onClick={handleDownload}
                    >
                      Скачать
                    </Button>
                    <Button 
                      icon={<CopyOutlined />}
                      onClick={handleCopyCode}
                    >
                      Скопировать код
                    </Button>
                  </Space>
                </div>
              </Card>
            </Col>
          </Row>

          {/* HTML код */}
          <Card title="HTML код для вставки" style={{ marginTop: 24 }}>
            <TextArea
              value={generateEmbedCode()}
              readOnly
              autoSize={{ minRows: 3, maxRows: 6 }}
              style={{ fontFamily: 'monospace' }}
            />
            <div style={{ marginTop: 12 }}>
              <Button 
                icon={<CopyOutlined />}
                onClick={handleCopyCode}
              >
                Скопировать код
              </Button>
            </div>
          </Card>
        </div>
      )
    },
    {
      key: 'links',
      label: 'Ссылки',
      children: (
        <div>
          <Card title="Реферальная ссылка">
            <div className={styles.linkSection}>
              <div className={styles.linkBox}>
                {referralLink}
              </div>
              <Button 
                type="primary" 
                icon={<CopyOutlined />}
                onClick={handleCopyLink}
              >
                Скопировать
              </Button>
            </div>
            <Paragraph type="secondary" style={{ marginTop: 16 }}>
              Используйте эту ссылку для привлечения новых пользователей. 
              Все регистрации по этой ссылке будут засчитаны как ваши рефералы.
            </Paragraph>
          </Card>

          <Card title="Короткие ссылки" style={{ marginTop: 24 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div className={styles.shortLink}>
                <Text strong>Для авторов:</Text>
                <div className={styles.linkSection}>
                  <div className={styles.linkBox}>
                    https://studwork.org/authors?ref=ABC123
                  </div>
                  <Button icon={<CopyOutlined />} size="small">
                    Копировать
                  </Button>
                </div>
              </div>
              
              <div className={styles.shortLink}>
                <Text strong>Для студентов:</Text>
                <div className={styles.linkSection}>
                  <div className={styles.linkBox}>
                    https://studwork.org/orders?ref=ABC123
                  </div>
                  <Button icon={<CopyOutlined />} size="small">
                    Копировать
                  </Button>
                </div>
              </div>
            </Space>
          </Card>
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
          Используйте готовые баннеры и ссылки для продвижения Студворк 
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