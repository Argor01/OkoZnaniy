import React, { useEffect, useRef, useState } from 'react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import landingStyles from '@/features/landing/Landing.module.css';
import styles from './FAQ.module.css';


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

  const imageRef = useScrollAnimation<HTMLElement>('fade-left');
  const contentRef = useScrollAnimation<HTMLDivElement>('fade-right');

  return (
    <section className={styles.faq} id="faq">
      <div className={landingStyles.mcontainer}>
        <div className={styles.faqWrapper}>
          <figure ref={imageRef} className={styles.faqPhoto}>
            <img className={styles.faqPhotoImage} src="/assets/faq/faq-image.png" alt="faq" width={1344} height={600} />
          </figure>

          <div ref={contentRef} className={styles.faqContent}>
            <h2 className={styles.faqTitle}>Часто спрашивают 🤔</h2>

            {faqData.map((item) => (
              <div 
                key={item.id} 
                className={`${styles.faqItem} ${activeItems.has(item.id) ? styles.active : ''}`}
              >
                <div 
                  className={styles.faqItemToggler}
                  onClick={() => toggleItem(item.id)}
                >
                  <div className={styles.faqItemTogglerQuestion}>{item.question}</div>
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
                  className={styles.faqItemPanel}
                >
                  <div className={styles.faqItemPanelAnswer}>
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
