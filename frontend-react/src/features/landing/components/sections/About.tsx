import React from 'react';

const About: React.FC = () => {
  return (
    <section className="about" id="about">
      <div className="mcontainer">
        <h2 className="about__title">О нас</h2>
        
        <div className="about__wrapper">
          <div className="about__mission">
            <h3 className="about__mission-title">Наша миссия</h3>
            <p className="about__mission-text">
              Мы помогаем студентам успешно преодолевать трудности обучения, 
              предоставляя качественную академическую поддержку с соблюдением 
              всех стандартов и требований.
            </p>
            <p className="about__mission-text">
              Наша команда состоит из профессиональных авторов, имеющих высшее 
              образование и богатый опыт в своих областях. Мы гордимся тем, что 
              помогли уже более 10 000 студентам по всей стране.
            </p>

            <div className="about__values">
              <div className="about__value-item">
                <figure className="about__value-icon">
                  <img src="/assets/about/quality-icon.svg" alt="Качество" width={48} height={48} />
                </figure>
                <div className="about__value-text">Качество</div>
              </div>
              <div className="about__value-item">
                <figure className="about__value-icon">
                  <img src="/assets/about/speed-icon.svg" alt="Оперативность" width={48} height={48} />
                </figure>
                <div className="about__value-text">Оперативность</div>
              </div>
              <div className="about__value-item">
                <figure className="about__value-icon">
                  <img src="/assets/about/reliability-icon.svg" alt="Надежность" width={48} height={48} />
                </figure>
                <div className="about__value-text">Надежность</div>
              </div>
            </div>
          </div>

          <div className="about__team">
            <div className="about__team-member">
              <figure className="about__team-photo">
                <img 
                  className="about__team-photo-image"
                  src="/assets/team/margarita.jpg" 
                  alt="Маргарита Рафиковна" 
                  width={200} 
                  height={200}
                />
              </figure>
              <div className="about__team-info">
                <h4 className="about__team-name">Маргарита Рафиковна</h4>
                <p className="about__team-role">Основатель компании</p>
                <p className="about__team-description">
                  Выпускница ведущего вуза России с опытом создания качественных 
                  учебных работ. Занималась репетиторством и помощью студентам, 
                  что позволило ей глубоко понять образовательные стандарты и 
                  современные требования к учебным работам.
                </p>
              </div>
            </div>

            <div className="about__team-member">
              <figure className="about__team-photo">
                <img 
                  className="about__team-photo-image"
                  src="/assets/team/venera.jpg" 
                  alt="Венера Фаридовна" 
                  width={200} 
                  height={200}
                />
              </figure>
              <div className="about__team-info">
                <h4 className="about__team-name">Венера Фаридовна</h4>
                <p className="about__team-role">Основатель компании</p>
                <p className="about__team-description">
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
