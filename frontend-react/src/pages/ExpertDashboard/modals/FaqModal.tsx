import React from 'react';
import { Modal, Typography, Collapse } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import styles from '../ExpertDashboard.module.css';

const { Text } = Typography;

interface FaqModalProps {
  visible: boolean;
  onClose: () => void;
  isMobile: boolean;
}

const FaqModal: React.FC<FaqModalProps> = ({ visible, onClose, isMobile }) => {
  const isDesktop = window.innerWidth > 1024;

  return (
    <Modal
      title={
        <div className={styles.faqModalTitle}>
          Часто задаваемые вопросы
        </div>
      }
      open={visible}
      centered
      onCancel={onClose}
      footer={null}
      width={isMobile ? '100%' : (isDesktop ? 'calc(100vw - 300px)' : 'calc(100vw - 270px)')}
      wrapClassName={`${styles.faqModalWrap} ${isMobile ? styles.faqModalWrapMobile : styles.faqModalWrapDesktop}`}
    >
      <div className={styles.faqModalContent}>
        <Text className={styles.faqModalIntro}>
          Мы постарались собрать самые распространенные вопросы и дать на них ответы. Чтобы вам было легче разобраться с нашим сервисом.
        </Text>
        
        <div className={styles.faqModalSection}>
          <Text strong className={styles.faqModalSectionTitle}>
            Заказы
          </Text>
          
          <Collapse
            expandIcon={({ isActive }) => (
              <PlusOutlined 
                className={`${styles.faqModalExpandIcon} ${isActive ? styles.faqModalExpandIconActive : ''}`}
              />
            )}
            expandIconPosition="end"
            className={styles.faqModalCollapse}
            items={[
              {
                key: '1',
                label: <Text className={styles.faqModalItemTitle}>Как пользоваться сервисом ОкоЗнаний?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    Сервис ОкоЗнаний предназначен для помощи студентам в выполнении различных учебных заданий. 
                    Заказчики размещают задания, а эксперты выполняют их за определенную плату. 
                    После регистрации вы можете создать заказ или стать экспертом и начать выполнять задания.
                  </Text>
                ),
                className: styles.faqModalItem
              },
              {
                key: '2',
                label: <Text className={styles.faqModalItemTitle}>Как разместить заказ на сервисе ОкоЗнаний?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    Чтобы разместить заказ, перейдите в раздел "Разместить задание" в верхней части страницы. 
                    Заполните форму с описанием задания, укажите тему, предмет, сроки выполнения и желаемую цену. 
                    После публикации заказа эксперты смогут предложить свою цену или вы сможете выбрать подходящего исполнителя.
                  </Text>
                ),
                className: styles.faqModalItem
              },
              {
                key: '3',
                label: <Text className={styles.faqModalItemTitle}>Как взять заказ на выполнение на сервисе ОкоЗнаний?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    Если вы зарегистрированы как эксперт, просматривайте доступные заказы в разделе "Заказы". 
                    Выберите подходящий заказ и нажмите кнопку "Предложить цену". 
                    После согласования цены с заказчиком заказ будет назначен вам на выполнение.
                  </Text>
                ),
                className: styles.faqModalItem
              },
              {
                key: '4',
                label: <Text className={styles.faqModalItemTitle}>Как пользоваться меню?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    Боковое меню содержит все основные разделы личного кабинета. 
                    Через меню вы можете перейти к сообщениям, уведомлениям, календарю, балансу, 
                    вашим заказам и работам, а также другим разделам сервиса.
                  </Text>
                ),
                className: styles.faqModalItem
              },
              {
                key: '5',
                label: <Text className={styles.faqModalItemTitle}>Как выбрать специалиста?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    При просмотре заказов вы увидите список предложений от разных экспертов с их ценами. 
                    Изучите профили экспертов: рейтинг, отзывы, специализации и примеры работ. 
                    Это поможет вам выбрать наиболее подходящего специалиста для вашего задания.
                  </Text>
                ),
                className: styles.faqModalItem
              },
              {
                key: '6',
                label: <Text className={styles.faqModalItemTitle}>Как оплатить заказ?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    Оплата заказа происходит безопасно через внутреннюю систему сервиса. 
                    Средства резервируются на вашем балансе и переводятся исполнителю только после принятия работы. 
                    Вы можете пополнить баланс через банковскую карту или электронные кошельки.
                  </Text>
                ),
                className: styles.faqModalItem
              },
              {
                key: '7',
                label: <Text className={styles.faqModalItemTitle}>Какие гарантии предоставляет сервис ОкоЗнаний для своих пользователей?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    Сервис ОкоЗнаний гарантирует безопасность сделок через систему гарантий. 
                    Деньги находятся в резерве до принятия работы заказчиком. 
                    При возникновении споров работает система арбитража. 
                    Мы проверяем работы на уникальность и обеспечиваем возврат средств в случае несоответствия требованиям.
                  </Text>
                ),
                className: styles.faqModalItem
              },
              {
                key: '8',
                label: <Text className={styles.faqModalItemTitle}>Что делать если заказ выполнен не качественно?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    Если работа не соответствует требованиям, вы можете отправить её на доработку без дополнительной оплаты. 
                    Специалист обязан доработать работу в течение указанного срока. 
                    В случае, если специалист отказывается дорабатывать или качество работы не улучшается, 
                    вы можете обратиться в арбитраж для возврата средств.
                  </Text>
                ),
                className: styles.faqModalItem
              },
              {
                key: '9',
                label: <Text className={styles.faqModalItemTitle}>В течении какого срока может быть выполнен заказ?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    Сроки выполнения заказа определяются при размещении задания. 
                    Минимальный срок зависит от сложности и объема работы. 
                    Стандартные сроки: от 1 до 7 дней для простых работ, от 7 до 30 дней для сложных. 
                    За срочные задания (менее 24 часов) может взиматься дополнительная плата.
                  </Text>
                ),
                className: styles.faqModalItem
              },
              {
                key: '10',
                label: <Text className={styles.faqModalItemTitle}>Как регулируются отношения между специалистом и заказчиком?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    Отношения регулируются Публичной офертой, правилами использования сервиса и договором оказания услуг. 
                    Все условия работы фиксируются в чате внутри заказа. 
                    В случае споров работает система арбитража, где независимые эксперты рассматривают спорные ситуации и принимают решение.
                  </Text>
                ),
                className: styles.faqModalItem
              },
            ]}
          />
        </div>

        <div className={styles.faqModalSection}>
          <Text strong className={styles.faqModalSectionTitle}>
            Финансы
          </Text>
          
          <Collapse
            expandIcon={({ isActive }) => (
              <PlusOutlined 
                className={`${styles.faqModalExpandIcon} ${isActive ? styles.faqModalExpandIconActive : ''}`}
              />
            )}
            expandIconPosition="end"
            className={styles.faqModalCollapse}
            items={[
              {
                key: '11',
                label: <Text className={styles.faqModalItemTitle}>Как пополнить баланс пользователя?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    Для пополнения баланса перейдите в раздел "На счету" в боковом меню и нажмите кнопку "Пополнить баланс". 
                    Вы можете пополнить баланс банковской картой, через систему быстрых платежей (СБП) или электронными кошельками. 
                    Минимальная сумма пополнения - 100 рублей.
                  </Text>
                ),
                className: styles.faqModalItem
              },
              {
                key: '12',
                label: <Text className={styles.faqModalItemTitle}>Как вывести денежные средства?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    Для вывода средств перейдите в раздел "На счету" и выберите "История операций". 
                    Нажмите кнопку "Вывести средства" и выберите способ вывода: на банковскую карту или электронный кошелек. 
                    Минимальная сумма вывода - 500 рублей. 
                    Средства поступят на ваш счет в течение 1-3 рабочих дней.
                  </Text>
                ),
                className: styles.faqModalItem
              },
              {
                key: '13',
                label: <Text className={styles.faqModalItemTitle}>Схема оплаты на сервисе ОкоЗнаний ("Безопасная сделка")</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    Система "Безопасная сделка" обеспечивает защиту интересов обеих сторон. 
                    Средства заказчика блокируются на время выполнения заказа. 
                    После принятия работы заказчиком средства автоматически переводятся специалисту. 
                    При возникновении споров средства остаются заблокированными до решения арбитража.
                  </Text>
                ),
                className: styles.faqModalItem
              },
            ]}
          />
        </div>

        <div className={styles.faqModalSection}>
          <Text strong className={styles.faqModalSectionTitle}>
            Профиль
          </Text>
          
          <Collapse
            expandIcon={({ isActive }) => (
              <PlusOutlined 
                className={`${styles.faqModalExpandIcon} ${isActive ? styles.faqModalExpandIconActive : ''}`}
              />
            )}
            expandIconPosition="end"
            className={styles.faqModalCollapse}
            items={[
              {
                key: '14',
                label: <Text className={styles.faqModalItemTitle}>Какие пользователи существуют на сервисе?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    На сервисе ОкоЗнаний существует несколько типов пользователей: заказчик - размещает задания и оплачивает работы; 
                    специалист - выполняет заказы за вознаграждение; менеджер ОкоЗнаний - персональный помощник по работе с сервисом; 
                    независимый эксперт - арбитр для решения споров; администратор и модераторы - обеспечивают работу сервиса.
                  </Text>
                ),
                className: styles.faqModalItem
              },
              {
                key: '15',
                label: <Text className={styles.faqModalItemTitle}>Кто такой специалист?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    Специалист - это пользователь, который выполняет учебные задания за вознаграждение. 
                    Чтобы стать специалистом, нужно зарегистрироваться, заполнить анкету и пройти проверку администрацией. 
                    Специалисты имеют специализации, рейтинг, отзывы от заказчиков и могут зарабатывать, выполняя заказы.
                  </Text>
                ),
                className: styles.faqModalItem
              },
              {
                key: '16',
                label: <Text className={styles.faqModalItemTitle}>Кто такой заказчик?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    Заказчик - это пользователь, который размещает задания для выполнения специалистами и оплачивает выполненные работы. 
                    Заказчик может выбирать специалистов, общаться с ними, отслеживать выполнение заказа и принимать или отклонять работу.
                  </Text>
                ),
                className: styles.faqModalItem
              },
              {
                key: '17',
                label: <Text className={styles.faqModalItemTitle}>Кто такой менеджер ОкоЗнаний (персональный менеджер)?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    Персональный менеджер ОкоЗнаний - это сотрудник сервиса, который помогает пользователям в работе с платформой. 
                    Менеджер консультирует по вопросам размещения заказов, выбора специалистов, решения споров и использования сервиса.
                  </Text>
                ),
                className: styles.faqModalItem
              },
              {
                key: '18',
                label: <Text className={styles.faqModalItemTitle}>Кто такой независимый эксперт?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    Независимый эксперт - это опытный пользователь, который помогает решать споры между заказчиками и специалистами в системе арбитража. 
                    Эксперты объективно оценивают качество выполненных работ и принимают решения о возврате средств, доработке или закрытии заказа.
                  </Text>
                ),
                className: styles.faqModalItem
              },
              {
                key: '19',
                label: <Text className={styles.faqModalItemTitle}>Чем занимается администрация и модераторы сервиса?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    Администрация сервиса управляет платформой, обеспечивает её работу, обрабатывает заявки на регистрацию специалистов, 
                    решает технические вопросы. Модераторы следят за соблюдением правил пользователями, проверяют контент, 
                    блокируют нарушителей и поддерживают порядок на платформе.
                  </Text>
                ),
                className: styles.faqModalItem
              },
            ]}
          />
        </div>
      </div>
    </Modal>
  );
};

export default FaqModal;
