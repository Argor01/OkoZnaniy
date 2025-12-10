import React from 'react';
import { Button, Typography, Tag } from 'antd';
import { EditOutlined, ClockCircleOutlined, DollarOutlined, LinkOutlined } from '@ant-design/icons';
import { UserProfile } from '../../types';
import styles from '../../ExpertDashboard.module.css';

const { Title, Paragraph } = Typography;

interface AboutTabProps {
  profile: UserProfile | null;
  isMobile: boolean;
  onEdit: () => void;
}

const AboutTab: React.FC<AboutTabProps> = ({ profile, isMobile, onEdit }) => {
  const isExpert = profile?.role === 'expert';
  
  const defaultBio = isExpert 
    ? 'Здравствуйте! Я опытный специалист с 5-летним стажем работы в сфере образования. Специализируюсь на помощи студентам в выполнении учебных работ по математике, физике и программированию. Имею высшее техническое образование и опыт преподавания в университете. Гарантирую качественное выполнение работ в срок, индивидуальный подход к каждому заказу и полное соответствие требованиям. Всегда на связи и готов ответить на любые вопросы по выполняемой работе.'
    : 'Расскажите немного о себе. Это поможет экспертам лучше понять ваши потребности и предложить наиболее подходящие решения.';
  
  const defaultEducation = 'Московский государственный технический университет им. Н.Э. Баумана, факультет информатики и систем управления, специальность "Прикладная математика и информатика", 2015-2020 гг. Диплом с отличием.';
  const defaultSkills = ['Математический анализ', 'Линейная алгебра', 'Дифференциальные уравнения', 'Теория вероятностей', 'Python', 'C++', 'JavaScript', 'Физика', 'Механика', 'Электродинамика'];

  const skills = profile?.skills ? profile.skills.split(',').map(s => s.trim()).filter(s => s) : (isExpert ? defaultSkills : []);

  return (
    <div className={styles.sectionCard}>
      <div className={styles.sectionCardHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className={styles.sectionTitle}>О себе</h2>
        <Button 
          type="primary"
          icon={<EditOutlined />}
          className={styles.buttonPrimary}
          onClick={onEdit}
        >
          {!isMobile && 'Редактировать'}
        </Button>
      </div>
      
      <Paragraph style={{ fontSize: 16, lineHeight: 1.8, color: '#4b5563' }}>
        {profile?.bio || defaultBio}
      </Paragraph>

      {/* Опыт и ставка - только для экспертов */}
      {isExpert && (
        <div style={{ display: 'flex', gap: 24, marginTop: 24, flexWrap: 'wrap' }}>
          {(profile?.experience_years !== undefined && profile?.experience_years !== null) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ClockCircleOutlined style={{ fontSize: 18, color: '#667eea' }} />
              <span style={{ fontSize: 16, color: '#4b5563' }}>
                <strong>Опыт:</strong> {profile.experience_years} {profile.experience_years === 1 ? 'год' : profile.experience_years < 5 ? 'года' : 'лет'}
              </span>
            </div>
          )}
          {(profile?.hourly_rate !== undefined && profile?.hourly_rate !== null && profile?.hourly_rate > 0) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <DollarOutlined style={{ fontSize: 18, color: '#667eea' }} />
              <span style={{ fontSize: 16, color: '#4b5563' }}>
                <strong>Ставка:</strong> {profile.hourly_rate} ₽/час
              </span>
            </div>
          )}
        </div>
      )}

      {/* Образование - только для экспертов */}
      {isExpert && (profile?.education || defaultEducation) && (
        <div style={{ marginTop: 24 }}>
          <Title level={4} style={{ marginBottom: 12 }}>Образование</Title>
          <Paragraph style={{ fontSize: 16, lineHeight: 1.8, color: '#4b5563' }}>
            {profile?.education || defaultEducation}
          </Paragraph>
        </div>
      )}

      {/* Навыки - только для экспертов */}
      {isExpert && skills.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <Title level={4} style={{ marginBottom: 12 }}>Навыки</Title>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {skills.map((skill: string, index: number) => (
              <Tag key={index} color="blue" style={{ padding: '4px 12px', fontSize: 14 }}>
                {skill}
              </Tag>
            ))}
          </div>
        </div>
      )}

      {/* Портфолио - только для экспертов */}
      {isExpert && profile?.portfolio_url && (
        <div style={{ marginTop: 24 }}>
          <Title level={4} style={{ marginBottom: 12 }}>Портфолио</Title>
          <a 
            href={profile.portfolio_url} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: 8,
              fontSize: 16,
              color: '#667eea',
              textDecoration: 'none'
            }}
          >
            <LinkOutlined />
            {profile.portfolio_url}
          </a>
        </div>
      )}
    </div>
  );
};

export default AboutTab;
