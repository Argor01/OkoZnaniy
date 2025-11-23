import React from 'react';

const ExpertFirstScreen: React.FC = () => {
  return (
    <section className="first-screen" style={{ paddingTop: '100px' }}>
      <div className="mcontainer">
        <div className="first-screen__wrapper">
          <div className="first-screen__content">
            <h1 className="first-screen__content-title">
              Стань автором студенческих работ
            </h1>
            <div className="first-screen__content-descripton">
              и зарабатывай от 100 000 ₽ в месяц
            </div>
          </div>

          <figure className="first-screen__figure">
            <img
              className="first-screen__figure-image"
              src="/assets/first-screen/first-screen-expert.png"
              alt="expert"
              width={811}
              height={879}
            />
          </figure>
        </div>
      </div>
    </section>
  );
};

export default ExpertFirstScreen;
