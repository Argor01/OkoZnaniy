import React from 'react';
import { Modal, Typography, Collapse } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import styles from './DirectorFaqModal.module.css';

const { Text } = Typography;

interface DirectorFaqModalProps {
  visible: boolean;
  onClose: () => void;
  isMobile: boolean;
}

const DirectorFaqModal: React.FC<DirectorFaqModalProps> = ({ visible, onClose, isMobile }) => {
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
          Здесь собраны ответы на основные вопросы по управлению платформой ОкоЗнаний. 
          Эта информация поможет вам эффективно управлять персоналом, финансами и партнёрской программой.
        </Text>
        
        <div className={styles.faqModalSection}>
          <Text strong className={styles.faqModalSectionTitle}>
            Управление персоналом
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
                label: <Text className={styles.faqModalItemTitle}>Как добавить нового сотрудника в систему?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    Перейдите в раздел "Управление персоналом" и нажмите кнопку "Добавить сотрудника". 
                    Заполните форму с данными сотрудника: ФИО, email, должность и роль в системе. 
                    После создания учетной записи сотрудник получит письмо с инструкциями для входа. 
                    Вы можете назначить роли: менеджер, модератор, арбитр или администратор.
                  </Text>
                ),
                className: styles.faqModalItem
              },
              {
                key: '2',
                label: <Text className={styles.faqModalItemTitle}>Как изменить роль или права доступа сотрудника?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    В разделе "Управление персоналом" найдите нужного сотрудника в списке и нажмите кнопку "Редактировать". 
                    Вы можете изменить роль, должность, статус активности и права доступа к различным разделам системы. 
                    Изменения вступают в силу немедленно после сохранения.
                  </Text>
                ),
                className: styles.faqModalItem
              },
              {
                key: '3',
                label: <Text className={styles.faqModalItemTitle}>Как отслеживать эффективность работы сотрудников?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    В разделе "Управление персоналом" доступна статистика по каждому сотруднику: 
                    количество обработанных заказов, решенных споров, время отклика на обращения пользователей. 
                    Вы можете просматривать детальные отчеты за любой период и экспортировать данные для анализа.
                  </Text>
                ),
                className: styles.faqModalItem
              },
              {
                key: '4',
                label: <Text className={styles.faqModalItemTitle}>Как временно заблокировать или удалить сотрудника?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    Для временной блокировки сотрудника измените его статус на "Неактивен" в разделе редактирования. 
                    Это заблокирует доступ к системе без удаления данных. 
                    Для полного удаления используйте кнопку "Удалить сотрудника" - это действие необратимо и требует подтверждения.
                  </Text>
                ),
                className: styles.faqModalItem
              },
              {
                key: '5',
                label: <Text className={styles.faqModalItemTitle}>Какие роли существуют в системе и чем они отличаются?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    Менеджер - консультирует пользователей и помогает с заказами. 
                    Модератор - проверяет контент, блокирует нарушителей. 
                    Арбитр - решает споры между заказчиками и специалистами. 
                    Администратор - имеет полный доступ к системе, управляет настройками. 
                    Директор - высший уровень доступа, управление всей платформой.
                  </Text>
                ),
                className: styles.faqModalItem
              },
            ]}
          />
        </div>

        <div className={styles.faqModalSection}>
          <Text strong className={styles.faqModalSectionTitle}>
            Финансы и статистика
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
                key: '6',
                label: <Text className={styles.faqModalItemTitle}>Как просмотреть финансовую статистику платформы?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    В разделе "Финансовая статистика" доступны данные о доходах, расходах, комиссиях и оборотах платформы. 
                    Вы можете выбрать период для анализа, просмотреть графики динамики и экспортировать отчеты в Excel или PDF. 
                    Статистика обновляется в режиме реального времени.
                  </Text>
                ),
                className: styles.faqModalItem
              },
              {
                key: '7',
                label: <Text className={styles.faqModalItemTitle}>Как отслеживать комиссии и доходы от заказов?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    В разделе "Финансовая статистика" есть детализация по комиссиям: 
                    общая сумма комиссий за период, средний процент комиссии, доходы по категориям заказов. 
                    Вы можете анализировать, какие типы заказов приносят наибольший доход и оптимизировать комиссионную политику.
                  </Text>
                ),
                className: styles.faqModalItem
              },
              {
                key: '8',
                label: <Text className={styles.faqModalItemTitle}>Как формировать финансовые отчеты?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    В разделе "Финансовая статистика" нажмите кнопку "Сформировать отчет". 
                    Выберите тип отчета (доходы, расходы, комиссии, обороты), период и формат (Excel, PDF, CSV). 
                    Отчет будет сформирован автоматически и доступен для скачивания. 
                    Вы также можете настроить автоматическую отправку отчетов на email.
                  </Text>
                ),
                className: styles.faqModalItem
              },
              {
                key: '9',
                label: <Text className={styles.faqModalItemTitle}>Как анализировать общую статистику платформы?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    Раздел "Общая статистика" содержит ключевые метрики: количество активных пользователей, 
                    новых регистраций, выполненных заказов, средний чек, конверсию. 
                    Графики показывают динамику роста платформы, а сравнительные данные помогают оценить эффективность изменений.
                  </Text>
                ),
                className: styles.faqModalItem
              },
            ]}
          />
        </div>

        <div className={styles.faqModalSection}>
          <Text strong className={styles.faqModalSectionTitle}>
            Партнёрская программа
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
                key: '10',
                label: <Text className={styles.faqModalItemTitle}>Как управлять партнёрской программой?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    В разделе "Панель партнёров" вы можете просматривать список всех партнёров, их статистику привлечения пользователей, 
                    начисленные вознаграждения и статусы выплат. 
                    Вы можете одобрять новых партнёров, изменять условия сотрудничества и блокировать нарушителей.
                  </Text>
                ),
                className: styles.faqModalItem
              },
              {
                key: '11',
                label: <Text className={styles.faqModalItemTitle}>Как изменить условия партнёрской программы?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    В разделе "Панель партнёров" нажмите кнопку "Настройки программы". 
                    Вы можете изменить процент вознаграждения, условия начисления бонусов, минимальную сумму для вывода средств. 
                    Изменения можно применить ко всем партнёрам или только к новым участникам программы.
                  </Text>
                ),
                className: styles.faqModalItem
              },
              {
                key: '12',
                label: <Text className={styles.faqModalItemTitle}>Как отслеживать эффективность партнёров?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    Для каждого партнёра доступна детальная статистика: количество привлечённых пользователей, 
                    конверсия в платящих клиентов, общий доход от рефералов, начисленные вознаграждения. 
                    Вы можете сортировать партнёров по эффективности и поощрять лучших дополнительными бонусами.
                  </Text>
                ),
                className: styles.faqModalItem
              },
              {
                key: '13',
                label: <Text className={styles.faqModalItemTitle}>Как обрабатывать заявки на вывод средств партнёрами?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    В разделе "Панель партнёров" есть вкладка "Заявки на вывод". 
                    Вы можете просматривать все заявки, проверять корректность данных и одобрять выплаты. 
                    После одобрения средства автоматически переводятся на указанные партнёром реквизиты. 
                    История всех выплат сохраняется для отчётности.
                  </Text>
                ),
                className: styles.faqModalItem
              },
            ]}
          />
        </div>

        <div className={styles.faqModalSection}>
          <Text strong className={styles.faqModalSectionTitle}>
            Коммуникация и модерация
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
                label: <Text className={styles.faqModalItemTitle}>Как работает внутренняя коммуникация с сотрудниками?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    Раздел "Внутренняя коммуникация" позволяет общаться с сотрудниками через встроенный чат. 
                    Вы можете создавать групповые чаты для отделов, отправлять важные объявления всем сотрудникам, 
                    обмениваться файлами и документами. Все сообщения сохраняются в истории.
                  </Text>
                ),
                className: styles.faqModalItem
              },
              {
                key: '15',
                label: <Text className={styles.faqModalItemTitle}>Как управлять банами за обмен контактами?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    В разделе "Баны за обмен контактами" отображаются все пользователи, заблокированные за попытку обмена контактами вне платформы. 
                    Вы можете просматривать причины блокировки, доказательства нарушения, снимать баны или продлевать их срок. 
                    Система автоматически детектирует подозрительные сообщения.
                  </Text>
                ),
                className: styles.faqModalItem
              },
              {
                key: '16',
                label: <Text className={styles.faqModalItemTitle}>Как просматривать и модерировать споры между пользователями?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    Хотя споры обычно решают арбитры, вы как директор можете просматривать все активные и завершённые споры. 
                    В случае сложных ситуаций вы можете вмешаться и принять окончательное решение. 
                    Доступна статистика по типам споров и качеству их разрешения арбитрами.
                  </Text>
                ),
                className: styles.faqModalItem
              },
            ]}
          />
        </div>

        <div className={styles.faqModalSection}>
          <Text strong className={styles.faqModalSectionTitle}>
            Настройки и безопасность
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
                label: <Text className={styles.faqModalItemTitle}>Как изменить глобальные настройки платформы?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    Глобальные настройки доступны через административную панель. 
                    Вы можете изменять комиссии платформы, лимиты на операции, правила модерации, 
                    настройки уведомлений и другие параметры. Критические изменения требуют подтверждения.
                  </Text>
                ),
                className: styles.faqModalItem
              },
              {
                key: '18',
                label: <Text className={styles.faqModalItemTitle}>Как обеспечивается безопасность данных?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    Платформа использует шифрование данных, двухфакторную аутентификацию для администраторов, 
                    регулярное резервное копирование и мониторинг подозрительной активности. 
                    Все действия сотрудников логируются. Вы можете просматривать журналы безопасности и настраивать политики доступа.
                  </Text>
                ),
                className: styles.faqModalItem
              },
              {
                key: '19',
                label: <Text className={styles.faqModalItemTitle}>Как получить техническую поддержку или помощь разработчиков?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    Для связи с технической поддержкой используйте специальный раздел в административной панели 
                    или отправьте запрос на email техподдержки. При критических проблемах доступна экстренная связь. 
                    Разработчики регулярно выпускают обновления и исправления, о которых вы получаете уведомления.
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

export default DirectorFaqModal;
