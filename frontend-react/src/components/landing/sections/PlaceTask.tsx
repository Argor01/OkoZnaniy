import React from 'react';


const PlaceTask: React.FC = () => (
  <section className="place-task" id="services">
    <div className="mcontainer">
      <div className="place-task__content">
        <h2 className="place-task__content-title">
          Разместите задание - мы сами отправим его лучшим авторам
        </h2>
        <div className="place-task__content-description">
          Наш сервис бесплатно отправит ваш запрос исполнителям, и вы получите предложения с
          ценами. Быстрее и удобнее, чем самостоятельный поиск в интернете!
        </div>
      </div>

      <div className="place-task__advantages">
        <div className="place-task__advantages-card">
          <figure className="place-task__advantages-card-figure">
            <img
              className="place-task__advantages-card-figure-image"
              src="/assets/place-task/place-task-icon-1.png"
              alt="icon"
              width={34}
              height={34}
            />
          </figure>
          <div className="place-task__advantages-card-text">9.4 / 10 Оценка качества</div>
        </div>

        <div className="place-task__advantages-card">
          <figure className="place-task__advantages-card-figure">
            <img
              className="place-task__advantages-card-figure-image"
              src="/assets/place-task/place-task-icon-2.png"
              alt="icon"
              width={34}
              height={34}
            />
          </figure>
          <div className="place-task__advantages-card-text">400 000+ экспертов</div>
        </div>

        <div className="place-task__advantages-card">
          <figure className="place-task__advantages-card-figure">
            <img
              className="place-task__advantages-card-figure-image"
              src="/assets/place-task/place-task-icon-3.png"
              alt="icon"
              width={34}
              height={34}
            />
          </figure>
          <div className="place-task__advantages-card-text">Работаем 24/7</div>
        </div>
      </div>
    </div>
  </section>
);

export default PlaceTask;



