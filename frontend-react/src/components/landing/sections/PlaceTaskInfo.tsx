import React from 'react';
import { useNavigate } from 'react-router-dom';


const PlaceTaskInfo: React.FC = () => {
  const navigate = useNavigate();
  return (
    <section className="place-task-info">
      <div className="mcontainer">
        <div className="place-task-info__wrapper">
          <div className="place-task-info__client">
            <div className="place-task-info__client-title">Для заказчика</div>
            <button className="place-task-info__client-button button" onClick={() => navigate('/client/orders')}>Разместить задание</button>
          </div>

          <div className="place-task-info__expert">
            <div className="place-task-info__expert-title">Для экспертов</div>
            <button className="place-task-info__expert-button button" onClick={() => navigate('/expert/dashboard')}>Стать экспертом</button>
          </div>

          <figure className="place-task-info__photo">
            <img className="place-task-info__photo-image" src="/assets/place-task-info/place-task-info-photo.png" alt="teacher" width={695} height={560} />
          </figure>
        </div>
      </div>
    </section>
  );
};

export default PlaceTaskInfo;



