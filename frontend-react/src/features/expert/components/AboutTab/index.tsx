import React, { useMemo } from 'react';
import { Typography, Tag, Skeleton } from 'antd';
import { ClockCircleOutlined, DollarOutlined, LinkOutlined } from '@ant-design/icons';
import { UserProfile } from '../../types';
import styles from './AboutTab.module.css';

const { Title, Paragraph } = Typography;

interface AboutTabProps {
  profile: UserProfile | null;
  loading?: boolean;
  isMobile: boolean;
  onEdit: () => void;
}

const AboutTab: React.FC<AboutTabProps> = React.memo(({ profile, loading, isMobile, onEdit }) => {
  const isExpert = profile?.role === 'expert';
  
  const emptyBio = isExpert
    ? 'Описание пока не заполнено.'
    : 'Расскажите немного о себе. Это поможет экспертам лучше понять ваши потребности и предложить наиболее подходящие решения.';
  
  const skills = useMemo(
    () => profile?.skills ? profile.skills.split(',').map(s => s.trim()).filter(Boolean) : [],
    [profile?.skills]
  );

  if (loading) {
    return (
      <div className={styles.sectionCard}>
        <div className={styles.sectionCardHeader}>
          <h2 className={styles.sectionTitle}>О себе</h2>
        </div>
        <Skeleton active paragraph={{ rows: 4 }} />
      </div>
    );
  }

  return (
    <div className={styles.sectionCard}>
      <div className={styles.sectionCardHeader}>
        <h2 className={styles.sectionTitle}>О себе</h2>
      </div>
      
      <Paragraph className={styles.aboutBio}>
        {profile?.bio || emptyBio}
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

      {isExpert && profile?.education && (
        <div className={styles.aboutSection}>
          <Title level={4} className={styles.aboutSectionTitle}>Образование</Title>
          <Paragraph className={styles.aboutSectionText}>
            {profile.education}
          </Paragraph>
        </div>
      )}

      {isExpert && skills.length > 0 && (
        <div className={styles.aboutSection}>
          <Title level={4} className={styles.aboutSectionTitle}>Навыки</Title>
          <div className={styles.aboutSkillsList}>
            {skills.map((skill: string, index: number) => (
              <Tag key={index} color="purple" className={styles.aboutSkillTag}>
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
});

export default AboutTab;
