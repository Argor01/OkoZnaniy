import React from 'react';

const PartnerFirstScreen: React.FC = () => {
  return (
    <section className="first-screen">
      <div className="mcontainer">
        <div className="first-screen__wrapper">
          <div className="first-screen__content">
            <h1 className="first-screen__content-title">
              Бизнес с Око Знаний — это просто!
            </h1>
            <div className="first-screen__content-descripton">
              Станьте партнером и развивайте свой бизнес вместе с нами
            </div>
          </div>

          <figure className="first-screen__figure">
            <img
              className="first-screen__figure-image"
              src="/assets/first-screen/first-screen-part.png"
              alt="partner"
              width={416}
              height={540}
            />
          </figure>
        </div>
      </div>
    </section>
  );
};

export default PartnerFirstScreen;
