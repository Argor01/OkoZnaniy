import React from 'react';
import { Modal, Typography, Collapse } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import styles from './AdminFaqModal.module.css';

const { Text } = Typography;

interface AdminFaqModalProps {
  visible: boolean;
  onClose: () => void;
  isMobile: boolean;
}

const AdminFaqModal: React.FC<AdminFaqModalProps> = ({ visible, onClose, isMobile }) => {
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
          Здесь собраны ответы на основные вопросы по работе в личном кабинете администратора ОкоЗнаний. 
          Эта информация поможет вам эффективно управлять платформой.
        </Text>
        
        <div className={styles.faqModalSection}>
          <Text strong className={styles.faqModalSectionTitle}>
            Партнёры и начисления
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
                label: <Text className={styles.faqModalItemTitle}>Как просмотреть информацию о партнёре?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    Перейдите в раздел «Партнёры» в боковом меню. В таблице отображаются все партнёры с основной информацией. 
                    Нажмите на партнёра, чтобы открыть модальное окно с полной информацией: контактные данные, реферальный код, 
                    статистика привлечённых пользователей и начисленные вознаграждения.
                  </Text>
                ),
                className: styles.faqModalItem
              },
              {
                key: '2',
                label: <Text className={styles.faqModalItemTitle}>Как управлять начислениями партнёров?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    В разделе «Начисления» вы видите список всех начислений партнёрам. 
                    Вы можете отметить начисление как выплаченное, нажав соответствующую кнопку. 
                    Статус начисления обновится автоматически.
                  </Text>
                ),
                className: styles.faqModalItem
              },
            ]}
          />
        </div>

        <div className={styles.faqModalSection}>
          <Text strong className={styles.faqModalSectionTitle}>
            Обращения и арбитраж
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
                key: '3',
                label: <Text className={styles.faqModalItemTitle}>Как работать с обращениями пользователей?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    В разделе «Обращения» отображаются все заявки от пользователей. 
                    Вы можете взять обращение в работу, ответить пользователю через встроенный чат, 
                    прикрепить файлы и завершить обращение после решения вопроса. 
                    Обращения можно фильтровать по статусу, приоритету и категории.
                  </Text>
                ),
                className: styles.faqModalItem
              },
              {
                key: '4',
                label: <Text className={styles.faqModalItemTitle}>Как работает арбитраж?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    Раздел «Арбитраж» содержит споры между заказчиками и исполнителями. 
                    Вы можете просмотреть детали спора, назначить арбитра, ознакомиться с доказательствами сторон. 
                    После рассмотрения спора арбитр выносит решение, которое фиксируется в системе.
                  </Text>
                ),
                className: styles.faqModalItem
              },
            ]}
          />
        </div>

        <div className={styles.faqModalSection}>
          <Text strong className={styles.faqModalSectionTitle}>
            Блокировка и модерация
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
                key: '5',
                label: <Text className={styles.faqModalItemTitle}>Как заблокировать пользователя?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    Перейдите в раздел «Блокировка». Найдите пользователя по имени или email. 
                    Нажмите кнопку блокировки — откроется модальное окно подтверждения с указанием причины. 
                    После блокировки пользователь не сможет входить в систему.
                  </Text>
                ),
                className: styles.faqModalItem
              },
              {
                key: '6',
                label: <Text className={styles.faqModalItemTitle}>Что такое «Баны за контакты»?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    Раздел «Баны за контакты» показывает пользователей, заблокированных за попытку обмена контактами 
                    вне платформы. Система автоматически обнаруживает подозрительные сообщения. 
                    Вы можете просмотреть причину бана, снять блокировку или продлить её.
                  </Text>
                ),
                className: styles.faqModalItem
              },
            ]}
          />
        </div>

        <div className={styles.faqModalSection}>
          <Text strong className={styles.faqModalSectionTitle}>
            Коммуникация и заказы
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
                label: <Text className={styles.faqModalItemTitle}>Как работает раздел «Коммуникация»?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    Раздел «Коммуникация» позволяет вести переписку с дирекцией и другими сотрудниками. 
                    Выберите обсуждение из списка слева, чтобы просмотреть историю сообщений и отправить ответ. 
                    Вы также можете прикреплять файлы и использовать эмодзи.
                  </Text>
                ),
                className: styles.faqModalItem
              },
              {
                key: '8',
                label: <Text className={styles.faqModalItemTitle}>Как управлять заказами?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    В разделе «Управление заказами» доступен полный список заказов на платформе. 
                    Вы можете фильтровать заказы по статусу, просматривать детали каждого заказа, 
                    отслеживать прогресс выполнения и при необходимости вмешиваться в процесс.
                  </Text>
                ),
                className: styles.faqModalItem
              },
              {
                key: '9',
                label: <Text className={styles.faqModalItemTitle}>Что такое «База Знаний»?</Text>,
                children: (
                  <Text className={styles.faqModalItemText}>
                    «База Знаний» — это раздел, в котором хранятся справочные материалы, инструкции и полезная информация 
                    для пользователей платформы. Вы можете добавлять, редактировать и удалять статьи, 
                    организовывать их по категориям для удобного поиска.
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

export default AdminFaqModal;
