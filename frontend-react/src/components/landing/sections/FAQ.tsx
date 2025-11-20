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
    question: 'Проверяется ли моя работа на плагиат?',
    answer: 'Да, все работы проходят обязательную проверку на плагиат с помощью современных сервисов. Мы сделаем необходимую для вас оригинальность работы по требованиям вашего ВУЗа.'
  },
  {
    id: 2,
    question: 'Есть ли гарантия на работу?',
    answer: 'Да, мы предоставляем гарантию на все выполненные работы. Если вас не устраивает результат, автор внесет бесплатные правки в течение 90 дней. А для дипломных, докторских, магистерских и кандидатских диссертаций мы предоставляем бессрочную гарантию на нашу работу до момента сдачи. Это значит, что вы сможете внести правки абсолютно бесплатно в любой момент выполнения заказа.',
    isActive: true
  },
  {
    id: 3,
    question: 'Работа напрямую с заказчиком',
    answer: 'Вы работаете напрямую с заказчиком через нашу платформу. Это позволяет оперативно решать все вопросы, обсуждать детали и вносить правки без посредников.'
  },
  {
    id: 4,
    question: 'Быстрая техническая поддержка 7 дней в неделю',
    answer: 'Наша служба поддержки работает 7 дней в неделю и готова помочь вам в любой ситуации. Мы оперативно отвечаем на вопросы и решаем возникающие проблемы.'
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
