import React from 'react';
import { Modal, Typography, Collapse } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import styles from './PartnerFaqModal.module.css';

const { Text } = Typography;

interface PartnerFaqModalProps {
  visible: boolean;
  onClose: () => void;
  isMobile: boolean;
}

const PartnerFaqModal: React.FC<PartnerFaqModalProps> = ({ visible, onClose, isMobile }) => {
  const isDesktop = window.innerWidth > 1024;

  return (
    <Modal
      title={
        <div className={styles.faqModalTitle}>
          Часто задаваемые вопросы партнеров
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
          Здесь собраны ответы на самые популярные вопросы о партнерской программе ОкоЗнаний. 
          Узнайте, как зарабатывать с нашей партнерской программой и эффективно привлекать клиентов.
        </Text>
        
        <div className={styles.faqModalSection}>
          <Text strong className={styles.faqModalSectionTitle}>
            Партнерская программа
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
                label: <Text className={styles.faqModalItemTitle}>Что такое партнерская программа ОкоЗнаний?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    Партнерская программа ОкоЗнаний - это возможность зарабатывать, привлекая новых клиентов на наш сервис. 
                    Вы получаете уникальную реферальную ссылку и зарабатываете 25% с каждой покупки работы клиентами, 
                    которые перешли по вашей ссылке. Комиссия выплачивается в течение 6 месяцев с момента первого перехода.
                  </Text>
                ),
                className: styles.faqModalItem
              },
              {
                key: '2',
                label: <Text className={styles.faqModalItemTitle}>Как стать партнером ОкоЗнаний?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    Чтобы стать партнером, зарегистрируйтесь на сайте и перейдите в раздел "Партнерская программа" в личном кабинете. 
                    Получите свою уникальную реферальную ссылку и начните делиться ей с потенциальными клиентами. 
                    Никаких дополнительных требований или вложений не требуется.
                  </Text>
                ),
                className: styles.faqModalItem
              },
              {
                key: '3',
                label: <Text className={styles.faqModalItemTitle}>Сколько можно заработать в партнерской программе?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    Размер заработка зависит от количества и активности привлеченных клиентов. 
                    Вы получаете 25% с каждой покупки работы. Например, если клиент заказал работу за 2000 рублей, 
                    вы получите 500 рублей. Активные партнеры могут зарабатывать от 10 000 до 100 000 рублей в месяц.
                  </Text>
                ),
                className: styles.faqModalItem
              },
              {
                key: '4',
                label: <Text className={styles.faqModalItemTitle}>Как получить партнерскую ссылку?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    Партнерская ссылка автоматически генерируется в вашем личном кабинете в разделе "Партнерская программа". 
                    Вы можете скопировать ссылку одним кликом и использовать её для привлечения клиентов. 
                    Ссылка уникальна для каждого партнера и позволяет отслеживать переходы и заказы.
                  </Text>
                ),
                className: styles.faqModalItem
              },
              {
                key: '5',
                label: <Text className={styles.faqModalItemTitle}>Где можно размещать партнерскую ссылку?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    Партнерскую ссылку можно размещать в социальных сетях, на образовательных форумах, 
                    в студенческих группах, на своем сайте или блоге, в мессенджерах. 
                    Главное - делиться ссылкой с людьми, которым может понадобиться помощь с учебными заданиями.
                  </Text>
                ),
                className: styles.faqModalItem
              },
              {
                key: '6',
                label: <Text className={styles.faqModalItemTitle}>Как долго действует партнерская ссылка?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    Партнерская ссылка действует бессрочно. После перехода клиента по вашей ссылке, 
                    вы будете получать комиссию с его заказов в течение 6 месяцев. 
                    Если клиент вернется на сайт через полгода, комиссия уже не будет начисляться.
                  </Text>
                ),
                className: styles.faqModalItem
              },
            ]}
          />
        </div>

        <div className={styles.faqModalSection}>
          <Text strong className={styles.faqModalSectionTitle}>
            Выплаты и доходы
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
                key: '7',
                label: <Text className={styles.faqModalItemTitle}>Когда начисляется партнерская комиссия?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    Партнерская комиссия начисляется после того, как клиент оплатил и получил выполненную работу. 
                    Средства поступают на ваш баланс после разблокировки средств по заказу, 
                    то есть когда заказчик принял работу или истек срок автоматического принятия.
                  </Text>
                ),
                className: styles.faqModalItem
              },
              {
                key: '8',
                label: <Text className={styles.faqModalItemTitle}>Как вывести заработанные средства?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    Заработанные средства можно вывести через раздел "Баланс" в личном кабинете. 
                    Доступны способы вывода: банковская карта, электронные кошельки, банковский перевод. 
                    Минимальная сумма для вывода - 500 рублей. Средства поступают в течение 1-3 рабочих дней.
                  </Text>
                ),
                className: styles.faqModalItem
              },
              {
                key: '9',
                label: <Text className={styles.faqModalItemTitle}>Есть ли комиссия за вывод средств?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    Комиссия за вывод средств зависит от выбранного способа. 
                    Вывод на банковскую карту - 2% от суммы, минимум 50 рублей. 
                    Вывод на электронные кошельки - 1-3% в зависимости от системы. 
                    Банковский перевод - фиксированная комиссия 100 рублей.
                  </Text>
                ),
                className: styles.faqModalItem
              },
              {
                key: '10',
                label: <Text className={styles.faqModalItemTitle}>Можно ли отслеживать статистику по рефералам?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    Да, в личном кабинете партнера доступна подробная статистика: 
                    количество переходов по ссылке, количество регистраций, активные рефералы, 
                    общий доход, ожидаемый доход с работ в процессе выполнения. 
                    Статистика обновляется в режиме реального времени.
                  </Text>
                ),
                className: styles.faqModalItem
              },
              {
                key: '11',
                label: <Text className={styles.faqModalItemTitle}>Что такое многоуровневая партнерская программа?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    В настоящее время действует одноуровневая партнерская программа - 
                    вы получаете комиссию только с прямых рефералов. 
                    Планируется запуск многоуровневой системы, где вы сможете получать 
                    дополнительный доход с рефералов ваших рефералов.
                  </Text>
                ),
                className: styles.faqModalItem
              },
            ]}
          />
        </div>

        <div className={styles.faqModalSection}>
          <Text strong className={styles.faqModalSectionTitle}>
            Продвижение и маркетинг
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
                key: '12',
                label: <Text className={styles.faqModalItemTitle}>Какие материалы для продвижения предоставляет ОкоЗнаний?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    Мы предоставляем партнерам готовые рекламные материалы: баннеры разных размеров, 
                    текстовые блоки для постов, промо-коды для дополнительной мотивации клиентов. 
                    Все материалы доступны в разделе "Промо-материалы" личного кабинета партнера.
                  </Text>
                ),
                className: styles.faqModalItem
              },
              {
                key: '13',
                label: <Text className={styles.faqModalItemTitle}>Можно ли использовать контекстную рекламу?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    Использование контекстной рекламы разрешено, но с ограничениями. 
                    Нельзя использовать брендовые запросы "ОкоЗнаний" и его вариации. 
                    Можно рекламироваться по общим запросам: "помощь студентам", "заказать курсовую" и т.д. 
                    Обязательно указывайте в объявлениях, что это партнерская ссылка.
                  </Text>
                ),
                className: styles.faqModalItem
              },
              {
                key: '14',
                label: <Text className={styles.faqModalItemTitle}>Как эффективно привлекать рефералов?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    Наиболее эффективные способы: создание полезного контента для студентов, 
                    участие в образовательных сообществах, личные рекомендации знакомым студентам, 
                    размещение отзывов о сервисе с партнерской ссылкой, 
                    создание обучающих материалов по учебным предметам.
                  </Text>
                ),
                className: styles.faqModalItem
              },
              {
                key: '15',
                label: <Text className={styles.faqModalItemTitle}>Есть ли ограничения на способы продвижения?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    Запрещены: спам в социальных сетях и мессенджерах, размещение ссылок на сайтах 
                    с незаконным контентом, использование ботов для накрутки переходов, 
                    введение пользователей в заблуждение относительно условий сервиса. 
                    За нарушения партнерский аккаунт может быть заблокирован.
                  </Text>
                ),
                className: styles.faqModalItem
              },
              {
                key: '16',
                label: <Text className={styles.faqModalItemTitle}>Можно ли создавать собственные промо-коды?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    Создание собственных промо-кодов недоступно для партнеров. 
                    Однако мы регулярно проводим акции и предоставляем партнерам специальные промо-коды 
                    для дополнительной мотивации клиентов. Следите за новостями в личном кабинете 
                    и уведомлениями о новых акциях.
                  </Text>
                ),
                className: styles.faqModalItem
              },
            ]}
          />
        </div>

        <div className={styles.faqModalSection}>
          <Text strong className={styles.faqModalSectionTitle}>
            Техническая поддержка
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
                key: '17',
                label: <Text className={styles.faqModalItemTitle}>Как связаться с поддержкой партнеров?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    Для связи с поддержкой партнеров используйте чат в личном кабинете, 
                    отправьте письмо на partners@okoznaniy.ru или обратитесь через форму обратной связи. 
                    Время ответа - до 24 часов в рабочие дни. 
                    Для срочных вопросов используйте онлайн-чат на сайте.
                  </Text>
                ),
                className: styles.faqModalItem
              },
              {
                key: '18',
                label: <Text className={styles.faqModalItemTitle}>Что делать, если не начисляется комиссия?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    Если комиссия не начисляется, проверьте: прошел ли клиент именно по вашей ссылке, 
                    оплатил ли он заказ, принял ли работу. Комиссия начисляется только после полного завершения заказа. 
                    Если все условия выполнены, а комиссия не пришла, обратитесь в поддержку с номером заказа.
                  </Text>
                ),
                className: styles.faqModalItem
              },
              {
                key: '19',
                label: <Text className={styles.faqModalItemTitle}>Можно ли восстановить заблокированный партнерский аккаунт?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    Восстановление заблокированного аккаунта возможно только при устранении причин блокировки. 
                    Обратитесь в поддержку с объяснением ситуации и планами по соблюдению правил. 
                    Решение принимается индивидуально в зависимости от серьезности нарушений 
                    и готовности партнера следовать правилам программы.
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

export default PartnerFaqModal;