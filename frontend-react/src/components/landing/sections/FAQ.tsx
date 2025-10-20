import React, { useEffect, useRef, useState } from 'react';


interface FAQItem {
  id: number;
  question: string;
  answer: string;
  isActive?: boolean;
}

const faqData: FAQItem[] = [
  {
    id: 1,
    question: 'Как выбрать автора?',
    answer: 'Чтобы выбрать автора, внимательно изучите его профиль, рейтинг, отзывы и примеры работ. Обратите внимание на специализацию и опыт в нужной области.'
  },
  {
    id: 2,
    question: 'Проверяются ли работы на плагиат?',
    answer: 'Да, все работы проходят обязательную проверку на плагиат с помощью современных сервисов. Мы гарантируем уникальность не менее 90%.'
  },
  {
    id: 3,
    question: 'Есть ли гарантии на работу?',
    answer: 'Да, мы предоставляем гарантию на все выполненные работы. Если вас не устраивает результат, автор внесет бесплатные правки в течение 30 дней.'
  },
  {
    id: 4,
    question: 'Как можно оплатить заказ?',
    answer: 'Оплата производится через личный кабинет банковской картой, электронными кошельками (Яндекс.Деньги, Qiwi, Payeer) и мобильными операторами России.',
    isActive: true
  },
  {
    id: 5,
    question: 'Есть ли у вас скидки?',
    answer: 'Да, у нас действует система скидок для постоянных клиентов, а также сезонные акции и промокоды. Следите за нашими предложениями!'
  }
];

const FAQ: React.FC = () => {
  const [activeItems, setActiveItems] = useState<Set<number>>(
    new Set(faqData.filter(item => item.isActive).map(item => item.id))
  );
  const panelsRef = useRef<Record<number, HTMLDivElement | null>>({});

  useEffect(() => {
    activeItems.forEach((id) => {
      const panel = panelsRef.current[id];
      if (panel) {
        const content = panel.firstElementChild as HTMLDivElement | null;
        const targetHeight = content ? content.scrollHeight : 0;
        panel.style.maxHeight = `${targetHeight}px`;
      }
    });
  }, [activeItems]);

  const toggleItem = (id: number) => {
    const newActiveItems = new Set(activeItems);
    if (newActiveItems.has(id)) {
      newActiveItems.delete(id);
    } else {
      newActiveItems.add(id);
    }
    setActiveItems(newActiveItems);
  };

  return (
    <section className="faq" id="faq">
      <div className="mcontainer">
        <div className="faq__wrapper">
          <figure className="faq__photo">
            <img className="faq__photo-image" src="/assets/faq/faq-image.png" alt="faq" width={1344} height={600} />
          </figure>

          <div className="faq__content">
            <h2 className="faq__title">Часто спрашивают 🤔</h2>

            {faqData.map((item) => (
              <div 
                key={item.id} 
                className={`faq__item ${activeItems.has(item.id) ? 'active' : ''}`}
              >
                <div 
                  className="faq__item-toggler"
                  onClick={() => toggleItem(item.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="faq__item-toggler-question">{item.question}</div>
                </div>

                <div
                  ref={(el) => {
                    if (!panelsRef.current) panelsRef.current = {};
                    panelsRef.current[item.id] = el;
                    if (el) {
                      el.style.maxHeight = activeItems.has(item.id)
                        ? `${(el.firstElementChild as HTMLDivElement | null)?.scrollHeight || 0}px`
                        : '0px';
                    }
                  }}
                  className="faq__item-panel"
                >
                  <div className="faq__item-panel-answer">
                    {item.answer}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
