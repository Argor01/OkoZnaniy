import React from 'react';
import { ShoppingOutlined, DollarOutlined, ClockCircleOutlined, LaptopOutlined } from '@ant-design/icons';

const ExpertAdvantages: React.FC = () => {
  return (
    <section className="place-task">
      <div className="mcontainer">
        <div className="place-task__content">
          <h2 className="place-task__content-title">Наши условия</h2>
        </div>

        <div className="place-task__advantages">
          <div className="place-task__advantages-card">
            <figure className="place-task__advantages-card-figure">
              <ShoppingOutlined className="place-task__advantages-card-icon" />
            </figure>
            <div className="place-task__advantages-card-text">Большой поток заказов</div>
          </div>

          <div className="place-task__advantages-card">
            <figure className="place-task__advantages-card-figure">
              <DollarOutlined className="place-task__advantages-card-icon" />
            </figure>
            <div className="place-task__advantages-card-text">Сам выбираешь задание и ставишь ставку</div>
          </div>

          <div className="place-task__advantages-card">
            <figure className="place-task__advantages-card-figure">
              <ClockCircleOutlined className="place-task__advantages-card-icon" />
            </figure>
            <div className="place-task__advantages-card-text">Гибкий график работы</div>
          </div>

          <div className="place-task__advantages-card">
            <figure className="place-task__advantages-card-figure">
              <LaptopOutlined className="place-task__advantages-card-icon" />
            </figure>
            <div className="place-task__advantages-card-text">Начни работать на удаленке прямо сейчас</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ExpertAdvantages;
