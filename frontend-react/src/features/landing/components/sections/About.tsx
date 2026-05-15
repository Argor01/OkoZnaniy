import React from 'react';
import landingStyles from '@/features/landing/Landing.module.css';
import styles from './About.module.css';

const About: React.FC = () => {
  return (
    <section className={styles.about} id="about">
      <div className={landingStyles.mcontainer}>
        <h2 className={styles.aboutTitle}>О нас</h2>
        
        <div className={styles.aboutWrapper}>
          <div className={styles.aboutMission}>
            <h3 className={styles.aboutMissionTitle}>Наша миссия</h3>
            <p className={styles.aboutMissionText}>
              Мы помогаем студентам успешно преодолевать трудности обучения, 
              предоставляя качественную академическую поддержку с соблюдением 
              всех стандартов и требований.
            </p>
            <p className={styles.aboutMissionText}>
              Наша команда состоит из профессиональных авторов, имеющих высшее 
              образование и богатый опыт в своих областях. Мы гордимся тем, что 
              помогли уже более 10 000 студентам по всей стране.
            </p>

            <div className={styles.aboutValues}>
              <div className={styles.aboutValueItem}>
                <figure className={styles.aboutValueIcon}>
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="24" cy="24" r="22" fill="#F0E8FF" stroke="#6435a5" strokeWidth="2"/>
                    <path d="M24 10L26.9 17.6L35 18.2L29.1 23.4L31 31.3L24 27.1L17 31.3L18.9 23.4L13 18.2L21.1 17.6L24 10Z" fill="#6435a5"/>
                  </svg>
                </figure>
                <div className={styles.aboutValueText}>Качество</div>
              </div>
              <div className={styles.aboutValueItem}>
                <figure className={styles.aboutValueIcon}>
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="24" cy="24" r="22" fill="#F0E8FF" stroke="#6435a5" strokeWidth="2"/>
                    <path d="M12 28C12 20.3 17.4 14 24 14C30.6 14 36 20.3 36 28" stroke="#6435a5" strokeWidth="2.5" strokeLinecap="round"/>
                    <path d="M24 28L30 20" stroke="#6435a5" strokeWidth="2.5" strokeLinecap="round"/>
                    <circle cx="24" cy="28" r="3" fill="#6435a5"/>
                    <path d="M18 34H30" stroke="#6435a5" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                </figure>
                <div className={styles.aboutValueText}>Оперативность</div>
              </div>
              <div className={styles.aboutValueItem}>
                <figure className={styles.aboutValueIcon}>
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="24" cy="24" r="22" fill="#F0E8FF" stroke="#6435a5" strokeWidth="2"/>
                    <path d="M24 11L34 15V24C34 29.5 29.5 34.4 24 36C18.5 34.4 14 29.5 14 24V15L24 11Z" fill="#6435a5" fillOpacity="0.2" stroke="#6435a5" strokeWidth="2.5" strokeLinejoin="round"/>
                    <path d="M20 24L22.5 26.5L28 21" stroke="#6435a5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </figure>
                <div className={styles.aboutValueText}>Надежность</div>
              </div>
            </div>
          </div>

          <div className={styles.aboutTeam}>
            <div className={styles.aboutTeamMember}>
              <figure className={styles.aboutTeamPhoto}>
                <img 
                  className={styles.aboutTeamPhotoImage}
                  src="/assets/team/margarita.jpg" 
                  alt="Маргарита Рафиковна" 
                  width={200} 
                  height={200}
                />
              </figure>
              <div className={styles.aboutTeamInfo}>
                <h4 className={styles.aboutTeamName}>Маргарита Рафиковна</h4>
                <p className={styles.aboutTeamRole}>Основатель компании</p>
                <p className={styles.aboutTeamDescription}>
                  Выпускница ведущего вуза России с опытом создания качественных 
                  учебных работ. Занималась репетиторством и помощью студентам, 
                  что позволило ей глубоко понять образовательные стандарты и 
                  современные требования к учебным работам.
                </p>
              </div>
            </div>

            <div className={styles.aboutTeamMember}>
              <figure className={styles.aboutTeamPhoto}>
                <img 
                  className={styles.aboutTeamPhotoImage}
                  src="/assets/team/venera.jpg" 
                  alt="Венера Фаридовна" 
                  width={200} 
                  height={200}
                />
              </figure>
              <div className={styles.aboutTeamInfo}>
                <h4 className={styles.aboutTeamName}>Венера Фаридовна</h4>
                <p className={styles.aboutTeamRole}>Основатель компании</p>
                <p className={styles.aboutTeamDescription}>
                  Имеет высшее образование и богатый опыт в педагогической сфере. 
                  Специализируется на консультировании студентов и помощи в 
                  подготовке научных работ. Ее стремление к качеству стало важным 
                  вкладом в развитие компании.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
