import React from 'react';
import { Card, Typography, Form, Select, Input, Button, message, theme } from 'antd';
import { useMutation } from '@tanstack/react-query';
import { ExclamationCircleOutlined, PlusSquareOutlined, SendOutlined, SearchOutlined, BarsOutlined } from '@ant-design/icons';
import { improvementApi, ImprovementArea } from '@/features/improvements/api/improvements';
import styles from './ImprovementsSurveyPage.module.css';

const { Title, Paragraph } = Typography;

const areaOptions: Array<{ value: ImprovementArea; label: string }> = [
  { value: 'ui_ux', label: 'Интерфейс и удобство' },
  { value: 'functionality', label: 'Функциональность' },
  { value: 'performance', label: 'Производительность' },
  { value: 'content', label: 'Контент' },
  { value: 'support', label: 'Поддержка' },
  { value: 'other', label: 'Другое' },
];

const ImprovementsSurveyPage: React.FC = () => {
  const { token } = theme.useToken();
  const [form] = Form.useForm<{ area: ImprovementArea; comment: string }>();

  const submitMutation = useMutation({
    mutationFn: improvementApi.submitSuggestion,
    onSuccess: () => {
      message.success('Спасибо! Ваша рекомендация отправлена директору.');
      form.resetFields();
    },
    onError: () => {
      message.error('Не удалось отправить анкету. Попробуйте еще раз.');
    },
  });

  const onFinish = (values: { area: ImprovementArea; comment: string }) => {
    submitMutation.mutate(values);
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.layout}>
        <div className={styles.mainColumn}>
          <Title level={3} className={styles.pageTitle}>Анкета обратной связи</Title>
          <Card className={styles.introCard}>
            <Title level={4} className={styles.introTitle}>Что можно улучшить?</Title>
            <Paragraph className={styles.introText}>
              Мы стремимся сделать сервис «Око Знаний» максимально удобным и полезным для вас.
              Поделитесь, пожалуйста, своими идеями: что стоит добавить, улучшить или изменить.
              Ваше мнение помогает нам развивать платформу в правильном направлении
            </Paragraph>
          </Card>

          <Card className={styles.formCard}>
            <Form form={form} layout="vertical" onFinish={onFinish}>
              <Form.Item
                label="Область улучшения"
                name="area"
                rules={[{ required: true, message: 'Выберите область улучшения' }]}
              >
                <Select options={areaOptions} placeholder="Например: интерфейс и удобство" />
              </Form.Item>

              <Form.Item
                label="Комментарий"
                name="comment"
                rules={[
                  { required: true, message: 'Введите комментарий' },
                  { min: 10, message: 'Комментарий должен быть не короче 10 символов' },
                ]}
              >
                <Input.TextArea rows={6} maxLength={1200} showCount placeholder="Опишите, что именно вы хотите улучшить" />
              </Form.Item>

              <div className={styles.submitRow}>
                <Button type="primary" htmlType="submit" loading={submitMutation.isPending} icon={<SendOutlined />}>
                  Отправить анкету
                </Button>
              </div>
            </Form>
          </Card>
        </div>

        <div className={styles.sideColumn}>
          <Card>
            <Title level={5} className={styles.sideTitle}>Какие идеи особенно полезны</Title>
            <ul className={styles.sideList}>
              <li><ExclamationCircleOutlined className={styles.sideIcon} style={{ color: token.colorWarning }} />Что неудобно делать прямо сейчас и почему</li>
              <li><PlusSquareOutlined className={styles.sideIcon} style={{ color: token.colorPrimary }} />Какой новый раздел или инструмент вы хотели бы видеть</li>
              <li><BarsOutlined className={styles.sideIcon} style={{ color: token.colorWarning }} />Какие шаги можно сократить в текущем сценарии</li>
              <li><SearchOutlined className={styles.sideIcon} style={{ color: token.colorPrimary }} />Что мешает быстрее находить нужную информацию</li>
            </ul>
          </Card>

          <Card>
            <Title level={5} className={styles.sideTitle}>Что дальше</Title>
            <Paragraph className={styles.metaText}>
              Анкета сразу попадает директору в раздел «Рекомендации по улучшению».
              Мы рассматриваем предложения регулярно и используем их при планировании
              новых обновлений сервиса
            </Paragraph>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ImprovementsSurveyPage;
