import React from 'react';
import { Modal, Typography, Collapse } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

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
        <div style={{ 
          fontSize: 24, 
          fontWeight: 600, 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          marginBottom: 8
        }}>
          Часто задаваемые вопросы
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width="auto"
      styles={{
        mask: {
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          backgroundColor: 'rgba(0, 0, 0, 0.3)'
        },
        content: { 
          borderRadius: isMobile ? 0 : 24, 
          padding: isMobile ? '16px' : '32px',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
          margin: isMobile ? 0 : undefined,
          maxWidth: isMobile ? '100vw' : undefined,
          top: isMobile ? 0 : '60px',
          left: isMobile ? 0 : (isDesktop ? '280px' : '250px'),
          right: isMobile ? 0 : '20px',
          bottom: isMobile ? 0 : '20px',
          width: isMobile ? '100vw' : (isDesktop ? 'calc(100vw - 300px)' : 'calc(100vw - 270px)'),
          height: isMobile ? '100vh' : 'calc(100vh - 80px)',
          transform: 'none',
          position: 'fixed'
        },
        body: {
          maxHeight: '70vh',
          overflowY: 'auto',
          padding: '0'
        }
      }}
    >
      <div style={{ paddingTop: 16 }}>
        <Text style={{ fontSize: 15, color: '#6b7280', display: 'block', marginBottom: 24 }}>
          Мы постарались собрать самые распространенные вопросы и дать на них ответы. Чтобы вам было легче разобраться с нашим сервисом.
        </Text>
        
        <div style={{ marginBottom: 16 }}>
          <Text strong style={{ fontSize: 18, color: '#1f2937', display: 'block', marginBottom: 16 }}>
            Заказы
          </Text>
          
          <Collapse
            expandIcon={({ isActive }) => (
              <PlusOutlined 
                style={{ 
                  fontSize: 16, 
                  color: '#667eea',
                  transform: isActive ? 'rotate(45deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s'
                }} 
              />
            )}
            expandIconPosition="end"
            style={{ 
              background: 'transparent',
              border: 'none'
            }}
            items={[
              {
                key: '1',
                label: <Text style={{ fontSize: 15, color: '#1f2937' }}>Как пользоваться сервисом ОкоЗнаний?</Text>,
                children: (
                  <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
                    Сервис ОкоЗнаний предназначен для помощи студентам в выполнении различных учебных заданий. 
                    Заказчики размещают задания, а эксперты выполняют их за определенную плату. 
                    После регистрации вы можете создать заказ или стать экспертом и начать выполнять задания.
                  </Text>
                ),
                style: { 
                  background: '#f9fafb',
                  borderRadius: 12,
                  marginBottom: 8,
                  border: '1px solid #e5e7eb'
                }
              },
              {
                key: '2',
                label: <Text style={{ fontSize: 15, color: '#1f2937' }}>Как разместить заказ на сервисе ОкоЗнаний?</Text>,
                children: (
                  <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
                    Чтобы разместить заказ, перейдите в раздел "Разместить задание" в верхней части страницы. 
                    Заполните форму с описанием задания, укажите тему, предмет, сроки выполнения и желаемую цену. 
                    После публикации заказа эксперты смогут предложить свою цену или вы сможете выбрать подходящего исполнителя.
                  </Text>
                ),
                style: { 
                  background: '#f9fafb',
                  borderRadius: 12,
                  marginBottom: 8,
                  border: '1px solid #e5e7eb'
                }
              },
              {
                key: '3',
                label: <Text style={{ fontSize: 15, color: '#1f2937' }}>Как взять заказ на выполнение на сервисе ОкоЗнаний?</Text>,
                children: (
                  <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
                    Если вы зарегистрированы как эксперт, просматривайте доступные заказы в разделе "Заказы". 
                    Выберите подходящий заказ и нажмите кнопку "Предложить цену". 
                    После согласования цены с заказчиком заказ будет назначен вам на выполнение.
                  </Text>
                ),
                style: { 
                  background: '#f9fafb',
                  borderRadius: 12,
                  marginBottom: 8,
                  border: '1px solid #e5e7eb'
                }
              },
              {
                key: '4',
                label: <Text style={{ fontSize: 15, color: '#1f2937' }}>Как пользоваться меню?</Text>,
                children: (
                  <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
                    Боковое меню содержит все основные разделы личного кабинета. 
                    Через меню вы можете перейти к сообщениям, уведомлениям, календарю, балансу, 
                    вашим заказам и работам, а также другим разделам сервиса.
                  </Text>
                ),
                style: { 
                  background: '#f9fafb',
                  borderRadius: 12,
                  marginBottom: 8,
                  border: '1px solid #e5e7eb'
                }
              },
              {
                key: '5',
                label: <Text style={{ fontSize: 15, color: '#1f2937' }}>Как выбрать специалиста?</Text>,
                children: (
                  <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
                    При просмотре заказов вы увидите список предложений от разных экспертов с их ценами. 
                    Изучите профили экспертов: рейтинг, отзывы, специализации и примеры работ. 
                    Это поможет вам выбрать наиболее подходящего специалиста для вашего задания.
                  </Text>
                ),
                style: { 
                  background: '#f9fafb',
                  borderRadius: 12,
                  marginBottom: 8,
                  border: '1px solid #e5e7eb'
                }
              },
              {
                key: '6',
                label: <Text style={{ fontSize: 15, color: '#1f2937' }}>Как оплатить заказ?</Text>,
                children: (
                  <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
                    Оплата заказа происходит безопасно через внутреннюю систему сервиса. 
                    Средства резервируются на вашем балансе и переводятся исполнителю только после принятия работы. 
                    Вы можете пополнить баланс через банковскую карту или электронные кошельки.
                  </Text>
                ),
                style: { 
                  background: '#f9fafb',
                  borderRadius: 12,
                  marginBottom: 8,
                  border: '1px solid #e5e7eb'
                }
              },
              {
                key: '7',
                label: <Text style={{ fontSize: 15, color: '#1f2937' }}>Какие гарантии предоставляет сервис ОкоЗнаний для своих пользователей?</Text>,
                children: (
                  <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
                    Сервис ОкоЗнаний гарантирует безопасность сделок через систему гарантий. 
                    Деньги находятся в резерве до принятия работы заказчиком. 
                    При возникновении споров работает система арбитража. 
                    Мы проверяем работы на уникальность и обеспечиваем возврат средств в случае несоответствия требованиям.
                  </Text>
                ),
                style: { 
                  background: '#f9fafb',
                  borderRadius: 12,
                  marginBottom: 8,
                  border: '1px solid #e5e7eb'
                }
              },
              {
                key: '8',
                label: <Text style={{ fontSize: 15, color: '#1f2937' }}>Что делать если заказ выполнен не качественно?</Text>,
                children: (
                  <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
                    Если работа не соответствует требованиям, вы можете отправить её на доработку без дополнительной оплаты. 
                    Специалист обязан доработать работу в течение указанного срока. 
                    В случае, если специалист отказывается дорабатывать или качество работы не улучшается, 
                    вы можете обратиться в арбитраж для возврата средств.
                  </Text>
                ),
                style: { 
                  background: '#f9fafb',
                  borderRadius: 12,
                  marginBottom: 8,
                  border: '1px solid #e5e7eb'
                }
              },
              {
                key: '9',
                label: <Text style={{ fontSize: 15, color: '#1f2937' }}>В течении какого срока может быть выполнен заказ?</Text>,
                children: (
                  <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
                    Сроки выполнения заказа определяются при размещении задания. 
                    Минимальный срок зависит от сложности и объема работы. 
                    Стандартные сроки: от 1 до 7 дней для простых работ, от 7 до 30 дней для сложных. 
                    За срочные задания (менее 24 часов) может взиматься дополнительная плата.
                  </Text>
                ),
                style: { 
                  background: '#f9fafb',
                  borderRadius: 12,
                  marginBottom: 8,
                  border: '1px solid #e5e7eb'
                }
              },
              {
                key: '10',
                label: <Text style={{ fontSize: 15, color: '#1f2937' }}>Как регулируются отношения между специалистом и заказчиком?</Text>,
                children: (
                  <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
                    Отношения регулируются Публичной офертой, правилами использования сервиса и договором оказания услуг. 
                    Все условия работы фиксируются в чате внутри заказа. 
                    В случае споров работает система арбитража, где независимые эксперты рассматривают спорные ситуации и принимают решение.
                  </Text>
                ),
                style: { 
                  background: '#f9fafb',
                  borderRadius: 12,
                  marginBottom: 8,
                  border: '1px solid #e5e7eb'
                }
              },
            ]}
          />
        </div>

        {/* Раздел Финансы */}
        <div style={{ marginBottom: 16 }}>
          <Text strong style={{ fontSize: 18, color: '#1f2937', display: 'block', marginBottom: 16 }}>
            Финансы
          </Text>
          
          <Collapse
            expandIcon={({ isActive }) => (
              <PlusOutlined 
                style={{ 
                  fontSize: 16, 
                  color: '#667eea',
                  transform: isActive ? 'rotate(45deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s'
                }} 
              />
            )}
            expandIconPosition="end"
            style={{ 
              background: 'transparent',
              border: 'none'
            }}
            items={[
              {
                key: '11',
                label: <Text style={{ fontSize: 15, color: '#1f2937' }}>Как пополнить баланс пользователя?</Text>,
                children: (
                  <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
                    Для пополнения баланса перейдите в раздел "На счету" в боковом меню и нажмите кнопку "Пополнить баланс". 
                    Вы можете пополнить баланс банковской картой, через систему быстрых платежей (СБП) или электронными кошельками. 
                    Минимальная сумма пополнения - 100 рублей.
                  </Text>
                ),
                style: { 
                  background: '#f9fafb',
                  borderRadius: 12,
                  marginBottom: 8,
                  border: '1px solid #e5e7eb'
                }
              },
              {
                key: '12',
                label: <Text style={{ fontSize: 15, color: '#1f2937' }}>Как вывести денежные средства?</Text>,
                children: (
                  <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
                    Для вывода средств перейдите в раздел "На счету" и выберите "История операций". 
                    Нажмите кнопку "Вывести средства" и выберите способ вывода: на банковскую карту или электронный кошелек. 
                    Минимальная сумма вывода - 500 рублей. 
                    Средства поступят на ваш счет в течение 1-3 рабочих дней.
                  </Text>
                ),
                style: { 
                  background: '#f9fafb',
                  borderRadius: 12,
                  marginBottom: 8,
                  border: '1px solid #e5e7eb'
                }
              },
              {
                key: '13',
                label: <Text style={{ fontSize: 15, color: '#1f2937' }}>Схема оплаты на сервисе ОкоЗнаний ("Безопасная сделка")</Text>,
                children: (
                  <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
                    Система "Безопасная сделка" обеспечивает защиту интересов обеих сторон. 
                    Средства заказчика блокируются на время выполнения заказа. 
                    После принятия работы заказчиком средства автоматически переводятся специалисту. 
                    При возникновении споров средства остаются заблокированными до решения арбитража.
                  </Text>
                ),
                style: { 
                  background: '#f9fafb',
                  borderRadius: 12,
                  marginBottom: 8,
                  border: '1px solid #e5e7eb'
                }
              },
            ]}
          />
        </div>

        {/* Раздел Профиль */}
        <div style={{ marginBottom: 16 }}>
          <Text strong style={{ fontSize: 18, color: '#1f2937', display: 'block', marginBottom: 16 }}>
            Профиль
          </Text>
          
          <Collapse
            expandIcon={({ isActive }) => (
              <PlusOutlined 
                style={{ 
                  fontSize: 16, 
                  color: '#667eea',
                  transform: isActive ? 'rotate(45deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s'
                }} 
              />
            )}
            expandIconPosition="end"
            style={{ 
              background: 'transparent',
              border: 'none'
            }}
            items={[
              {
                key: '14',
                label: <Text style={{ fontSize: 15, color: '#1f2937' }}>Какие пользователи существуют на сервисе?</Text>,
                children: (
                  <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
                    На сервисе ОкоЗнаний существует несколько типов пользователей: заказчик - размещает задания и оплачивает работы; 
                    специалист - выполняет заказы за вознаграждение; менеджер ОкоЗнаний - персональный помощник по работе с сервисом; 
                    независимый эксперт - арбитр для решения споров; администратор и модераторы - обеспечивают работу сервиса.
                  </Text>
                ),
                style: { 
                  background: '#f9fafb',
                  borderRadius: 12,
                  marginBottom: 8,
                  border: '1px solid #e5e7eb'
                }
              },
              {
                key: '15',
                label: <Text style={{ fontSize: 15, color: '#1f2937' }}>Кто такой специалист?</Text>,
                children: (
                  <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
                    Специалист - это пользователь, который выполняет учебные задания за вознаграждение. 
                    Чтобы стать специалистом, нужно зарегистрироваться, заполнить анкету и пройти проверку администрацией. 
                    Специалисты имеют специализации, рейтинг, отзывы от заказчиков и могут зарабатывать, выполняя заказы.
                  </Text>
                ),
                style: { 
                  background: '#f9fafb',
                  borderRadius: 12,
                  marginBottom: 8,
                  border: '1px solid #e5e7eb'
                }
              },
              {
                key: '16',
                label: <Text style={{ fontSize: 15, color: '#1f2937' }}>Кто такой заказчик?</Text>,
                children: (
                  <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
                    Заказчик - это пользователь, который размещает задания для выполнения специалистами и оплачивает выполненные работы. 
                    Заказчик может выбирать специалистов, общаться с ними, отслеживать выполнение заказа и принимать или отклонять работу.
                  </Text>
                ),
                style: { 
                  background: '#f9fafb',
                  borderRadius: 12,
                  marginBottom: 8,
                  border: '1px solid #e5e7eb'
                }
              },
              {
                key: '17',
                label: <Text style={{ fontSize: 15, color: '#1f2937' }}>Кто такой менеджер ОкоЗнаний (персональный менеджер)?</Text>,
                children: (
                  <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
                    Персональный менеджер ОкоЗнаний - это сотрудник сервиса, который помогает пользователям в работе с платформой. 
                    Менеджер консультирует по вопросам размещения заказов, выбора специалистов, решения споров и использования сервиса.
                  </Text>
                ),
                style: { 
                  background: '#f9fafb',
                  borderRadius: 12,
                  marginBottom: 8,
                  border: '1px solid #e5e7eb'
                }
              },
              {
                key: '18',
                label: <Text style={{ fontSize: 15, color: '#1f2937' }}>Кто такой независимый эксперт?</Text>,
                children: (
                  <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
                    Независимый эксперт - это опытный пользователь, который помогает решать споры между заказчиками и специалистами в системе арбитража. 
                    Эксперты объективно оценивают качество выполненных работ и принимают решения о возврате средств, доработке или закрытии заказа.
                  </Text>
                ),
                style: { 
                  background: '#f9fafb',
                  borderRadius: 12,
                  marginBottom: 8,
                  border: '1px solid #e5e7eb'
                }
              },
              {
                key: '19',
                label: <Text style={{ fontSize: 15, color: '#1f2937' }}>Чем занимается администрация и модераторы сервиса?</Text>,
                children: (
                  <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
                    Администрация сервиса управляет платформой, обеспечивает её работу, обрабатывает заявки на регистрацию специалистов, 
                    решает технические вопросы. Модераторы следят за соблюдением правил пользователями, проверяют контент, 
                    блокируют нарушителей и поддерживают порядок на платформе.
                  </Text>
                ),
                style: { 
                  background: '#f9fafb',
                  borderRadius: 12,
                  marginBottom: 8,
                  border: '1px solid #e5e7eb'
                }
              },
            ]}
          />
        </div>
      </div>
    </Modal>
  );
};

export default FaqModal;
