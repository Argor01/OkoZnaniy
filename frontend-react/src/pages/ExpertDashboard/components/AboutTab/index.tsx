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
      <div className={styles.sectionCardHeader}>
        <h2 className={styles.sectionTitle}>О себе</h2>
      </div>
      
      <Paragraph className={styles.aboutBio}>
        {profile?.bio || defaultBio}
      </Paragraph>

      {isExpert && (
        <div className={styles.aboutHighlights}>
          {(profile?.experience_years !== undefined && profile?.experience_years !== null) && (
            <div className={styles.aboutHighlightItem}>
              <ClockCircleOutlined className={styles.aboutHighlightIcon} />
              <span className={styles.aboutHighlightText}>
                <strong>Опыт:</strong> {profile.experience_years} {profile.experience_years === 1 ? 'год' : profile.experience_years < 5 ? 'года' : 'лет'}
              </span>
            </div>
          )}
          {(profile?.hourly_rate !== undefined && profile?.hourly_rate !== null && profile?.hourly_rate > 0) && (
            <div className={styles.aboutHighlightItem}>
              <DollarOutlined className={styles.aboutHighlightIcon} />
              <span className={styles.aboutHighlightText}>
                <strong>Ставка:</strong> {profile.hourly_rate} ₽/час
              </span>
            </div>
          )}
        </div>
      )}

      {isExpert && (profile?.education || defaultEducation) && (
        <div className={styles.aboutSection}>
          <Title level={4} className={styles.aboutSectionTitle}>Образование</Title>
          <Paragraph className={styles.aboutSectionText}>
            {profile?.education || defaultEducation}
          </Paragraph>
        </div>
      )}

      {isExpert && skills.length > 0 && (
        <div className={styles.aboutSection}>
          <Title level={4} className={styles.aboutSectionTitle}>Навыки</Title>
          <div className={styles.aboutSkillsList}>
            {skills.map((skill: string, index: number) => (
              <Tag key={index} color="blue" className={styles.aboutSkillTag}>
                {skill}
              </Tag>
            ))}
          </div>
        </div>
      )}

      {isExpert && profile?.portfolio_url && (
        <div className={styles.aboutSection}>
          <Title level={4} className={styles.aboutSectionTitle}>Портфолио</Title>
          <a 
            href={profile.portfolio_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className={styles.aboutPortfolioLink}
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
