import React from 'react';
import { useNavigate } from 'react-router-dom';

const FirstScreen: React.FC = () => {
  const navigate = useNavigate();
  return (
    <section className="first-screen">
      <div className="mcontainer">
        <div className="first-screen__wrapper">
          <div className="first-screen__content">
            <h1 className="first-screen__content-title">
              Онлайн сервис помощи студентам: быстро, надёжно, по выгодной цене
            </h1>
            <div className="first-screen__content-descripton">
              Экономьте время: Разместите задание, и эксперт быстро поможет с консультацией
            </div>
            <div className="first-screen__content-buttons">
              <button className="first-screen__content-buttons-task button" onClick={() => navigate('/create-order')}>
                Разместить задание
              </button>
              <button className="first-screen__content-buttons-expert button" onClick={() => navigate('/login')}>Стать экспертом</button>
            </div>
          </div>

          <figure className="first-screen__figure">
            <img
              className="first-screen__figure-image"
              src="/assets/first-screen/first-screen-students.png"
              alt="students"
              width={811}
              height={879}
            />
          </figure>
        </div>
      </div>
    </section>
  );
};

export default FirstScreen;



