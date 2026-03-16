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
  Input,
  Segmented
} from 'antd';
import { 
  DownloadOutlined, 
  CopyOutlined, 
  FileImageOutlined,
  LinkOutlined,
  CodeOutlined,
  UserOutlined,
  BookOutlined
} from '@ant-design/icons';
import styles from './PromoMaterials.module.css';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

type TargetAudience = 'authors' | 'students';

interface BannerConfig {
  id: string;
  name: string;
  sizes: string[];
  orientations: ('horizontal' | 'vertical')[];
  designs: number[];
  audiences: TargetAudience[];
}

const bannerConfigs: BannerConfig[] = [
  {
    id: 'static',
    name: 'Статичный баннер',
    sizes: ['300x250', '320x50', '336x280', '468x60', '728x90', '970x90', '970x250'],
    orientations: ['horizontal', 'vertical'],
    designs: [1, 2, 3],
    audiences: ['authors', 'students']
  }
];

export const PromoMaterials: React.FC = () => {
  const [targetAudience, setTargetAudience] = useState<TargetAudience>('authors');
  const [selectedBannerType] = useState('static');
  const [selectedOrientation, setSelectedOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
  const [selectedSize, setSelectedSize] = useState('970x250');
  const [selectedDesign, setSelectedDesign] = useState(1);
  const [selectedFormat, setSelectedFormat] = useState('png');
  const [referralLink] = useState('https://studwork.org/ref/ABC123');

  const currentConfig = bannerConfigs.find(config => config.id === selectedBannerType);

  const generateBannerUrl = () => {
    return `https://cdn.studwork.org/banners/${selectedBannerType}/${targetAudience}/${selectedSize}/${selectedDesign}.${selectedFormat}`;
  };

  const generateEmbedCode = () => {
    const bannerUrl = generateBannerUrl();
    const targetUrl = targetAudience === 'authors' 
      ? `${referralLink}/authors` 
      : `${referralLink}/orders`;
    
    return `<a href="${targetUrl}"><img src="${bannerUrl}" alt="Студворк - ${targetAudience === 'authors' ? 'работа для авторов' : 'помощь студентам'}" /></a>`;
  };

  const handleDownload = () => {
    message.success(`Баннер для ${targetAudience === 'authors' ? 'авторов' : 'студентов'} скачан`);
  };

  const handleCopyCode = () => {
    const code = generateEmbedCode();
    navigator.clipboard.writeText(code);
    message.success('HTML код скопирован в буфер обмена');
  };

  const handleCopyLink = (linkType: 'main' | 'authors' | 'students') => {
    let link = referralLink;
    if (linkType === 'authors') {
      link = `${referralLink}/authors`;
    } else if (linkType === 'students') {
      link = `${referralLink}/orders`;
    }
    
    navigator.clipboard.writeText(link);
    message.success('Ссылка скопирована');
  };

  const getBannerContent = () => {
    if (targetAudience === 'authors') {
      return {
        logo: '🚀 СТУДВОРК',
        text: 'Ищешь работу на дому?',
        button: 'Стать автором',
        gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      };
    } else {
      return {
        logo: '📚 СТУДВОРК',
        text: 'Нужна помощь с учебой?',
        button: 'Заказать работу',
        gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
      };
    }
  };

  const renderBannerPreview = () => {
    const [width, height] = selectedSize.split('x').map(Number);
    const aspectRatio = width / height;
    const content = getBannerContent();
    
    return (
      <div className={styles.bannerPreview}>
        <div 
          className={styles.bannerPlaceholder}
          style={{
            aspectRatio: aspectRatio,
            maxWidth: Math.min(width, 400),
            maxHeight: Math.min(height, 300),
            background: content.gradient
          }}
        >
          <div className={styles.bannerContent}>
            <div className={styles.bannerLogo}>
              {content.logo}
            </div>
            <div className={styles.bannerText}>
              {content.text}
            </div>
            <div className={styles.bannerButton}>
              {content.button}
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
          {/* Выбор целевой аудитории */}
          <Card className={styles.audienceCard} style={{ marginBottom: 24 }}>
            <div className={styles.audienceSection}>
              <Title level={4}>Целевая аудитория</Title>
              <Segmented
                value={targetAudience}
                onChange={(value) => setTargetAudience(value as TargetAudience)}
                options={[
                  {
                    label: (
                      <div className={styles.segmentOption}>
                        <UserOutlined />
                        <span>Для авторов</span>
                      </div>
                    ),
                    value: 'authors'
                  },
                  {
                    label: (
                      <div className={styles.segmentOption}>
                        <BookOutlined />
                        <span>Для студентов</span>
                      </div>
                    ),
                    value: 'students'
                  }
                ]}
                size="large"
                className={styles.audienceSegmented}
              />
              <Paragraph type="secondary" style={{ marginTop: 12 }}>
                {targetAudience === 'authors' 
                  ? 'Баннеры для привлечения авторов - людей, которые хотят зарабатывать, выполняя учебные работы'
                  : 'Баннеры для привлечения студентов - людей, которым нужна помощь с учебными работами'
                }
              </Paragraph>
            </div>
          </Card>

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
          <Card title="Основная реферальная ссылка">
            <div className={styles.linkSection}>
              <div className={styles.linkBox}>
                {referralLink}
              </div>
              <Button 
                type="primary" 
                icon={<CopyOutlined />}
                onClick={() => handleCopyLink('main')}
              >
                Скопировать
              </Button>
            </div>
            <Paragraph type="secondary" style={{ marginTop: 16 }}>
              Универсальная ссылка для привлечения пользователей. 
              Все регистрации по этой ссылке будут засчитаны как ваши рефералы.
            </Paragraph>
          </Card>

          <Card title="Специализированные ссылки" style={{ marginTop: 24 }}>
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <div className={styles.specializedLink}>
                <div className={styles.linkHeader}>
                  <UserOutlined className={styles.linkIcon} />
                  <div>
                    <Text strong>Для авторов</Text>
                    <div className={styles.linkDescription}>
                      Ссылка ведет на страницу регистрации авторов
                    </div>
                  </div>
                </div>
                <div className={styles.linkSection}>
                  <div className={styles.linkBox}>
                    {referralLink}/authors
                  </div>
                  <Button 
                    icon={<CopyOutlined />} 
                    onClick={() => handleCopyLink('authors')}
                  >
                    Копировать
                  </Button>
                </div>
              </div>
              
              <div className={styles.specializedLink}>
                <div className={styles.linkHeader}>
                  <BookOutlined className={styles.linkIcon} />
                  <div>
                    <Text strong>Для студентов</Text>
                    <div className={styles.linkDescription}>
                      Ссылка ведет на страницу размещения заказов
                    </div>
                  </div>
                </div>
                <div className={styles.linkSection}>
                  <div className={styles.linkBox}>
                    {referralLink}/orders
                  </div>
                  <Button 
                    icon={<CopyOutlined />} 
                    onClick={() => handleCopyLink('students')}
                  >
                    Копировать
                  </Button>
                </div>
              </div>
            </Space>
          </Card>

          <Card title="Рекомендации по использованию" style={{ marginTop: 24 }}>
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <div className={styles.recommendationCard}>
                  <UserOutlined className={styles.recommendationIcon} />
                  <Title level={5}>Для авторов</Title>
                  <ul className={styles.recommendationList}>
                    <li>Размещайте на форумах фрилансеров</li>
                    <li>Используйте в социальных сетях</li>
                    <li>Отправляйте знакомым, ищущим подработку</li>
                    <li>Размещайте на сайтах о заработке</li>
                  </ul>
                </div>
              </Col>
              <Col xs={24} md={12}>
                <div className={styles.recommendationCard}>
                  <BookOutlined className={styles.recommendationIcon} />
                  <Title level={5}>Для студентов</Title>
                  <ul className={styles.recommendationList}>
                    <li>Размещайте в студенческих группах</li>
                    <li>Делитесь в университетских чатах</li>
                    <li>Рекомендуйте одногруппникам</li>
                    <li>Используйте на образовательных форумах</li>
                  </ul>
                </div>
              </Col>
            </Row>
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
          среди авторов и студентов
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