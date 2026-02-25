import React from 'react';
import { useNavigate } from 'react-router-dom';


const LeaveOrder: React.FC = () => {
  const navigate = useNavigate();
  return (
    <section className="leave-order" id="orders">
      <div className="mcontainer">
        <h2 className="leave-order__title">Закажи работу за три шага 🤝</h2>

        <div className="leave-order__steps">
          <div className="leave-order__steps-wrapper">
            <div className="leave-order__steps-item">
              <div className="leave-order__steps-item-title">Оставь заявку</div>
              <figure className="leave-order__steps-item-icon">
                <img
                  className="leave-order__steps-item-icon-image"
                  src="/assets/leave-order/leave-order-icon-1.svg"
                  alt="icons"
                  width={66}
                  height={66}
                />
              </figure>
              <div className="leave-order__steps-item-text">
                Пару минут — и твоя задача уже доступна авторам
              </div>
            </div>

            <div className="leave-order__steps-item">
              <div className="leave-order__steps-item-title">Выбери профессионала</div>
              <figure className="leave-order__steps-item-icon">
                <img
                  className="leave-order__steps-item-icon-image"
                  src="/assets/leave-order/leave-order-icon-2.svg"
                  alt="icons"
                  width={66}
                  height={66}
                />
              </figure>
              <div className="leave-order__steps-item-text">
                Оцените анкеты специалистов, их рейтинг и отзывы
              </div>
            </div>

            <div className="leave-order__steps-item">
              <div className="leave-order__steps-item-title">Забирай результат</div>
              <figure className="leave-order__steps-item-icon">
                <img
                  className="leave-order__steps-item-icon-image"
                  src="/assets/leave-order/leave-order-icon-3.svg"
                  alt="icons"
                  width={66}
                  height={66}
                />
              </figure>
              <div className="leave-order__steps-item-text">
                Оплачивай — и скачивай готовую работу в своём личном кабинете
              </div>
            </div>
          </div>
        </div>

        <div className="leave-order__order">
          <button className="leave-order__order-button button" onClick={() => navigate('/client/orders')}>Разместить заказ</button>
        </div>
      </div>
    </section>
  );
};

export default LeaveOrder;
