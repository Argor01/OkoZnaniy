import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal, Typography, Form } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { catalogApi } from '@/features/common/api/catalog';
import { AppButton, AppInput, AppSelect, AppDatePicker } from '@/components/ui';
import styles from './IndividualOfferModal.module.css';

const { Text, Title } = Typography;

interface IndividualOfferModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: OfferSubmitData) => void;
  loading?: boolean;
  variant?: 'individual' | 'work_offer';
  workTitle?: string;
}

type OfferSubmitData = {
  description: string;
  work_type_id?: number;
  work_type?: string;
  subject_id?: number;
  subject?: string;
  cost: number;
  deadline: string | null;
} & Record<string, unknown>;

type OfferFormValues = {
  description: string;
  work_type_id?: number;
  subject_id?: number;
  cost: number;
  deadline: { toISOString: () => string } | null;
} & Record<string, unknown>;

const IndividualOfferModal: React.FC<IndividualOfferModalProps> = ({
  open,
  onClose,
  onSubmit,
  loading,
  variant = 'individual',
  workTitle,
}) => {
  const [form] = Form.useForm();

  const isIndividual = variant === 'individual';

  const { data: subjects = [], isLoading: subjectsLoading } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => catalogApi.getSubjects(),
    enabled: open && isIndividual,
  });

  const { data: workTypes = [], isLoading: workTypesLoading } = useQuery({
    queryKey: ['work-types'],
    queryFn: () => catalogApi.getWorkTypes(),
    enabled: open && isIndividual,
  });

  const handleFinish = (values: OfferFormValues) => {
    const selectedWorkType = isIndividual
      ? workTypes.find((w) => w.id === values.work_type_id)
      : undefined;
    const selectedSubject = isIndividual
      ? subjects.find((s) => s.id === values.subject_id)
      : undefined;

    const data: OfferSubmitData = {
      ...values,
      work_type_id: isIndividual ? values.work_type_id : undefined,
      work_type: isIndividual ? selectedWorkType?.name : undefined,
      subject_id: isIndividual ? values.subject_id : undefined,
      subject: isIndividual ? selectedSubject?.name : undefined,
      deadline: isIndividual && values.deadline ? values.deadline.toISOString() : null,
    };
    onSubmit(data);
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
      title={
        <div className={styles.titleWrapper}>
          <Title level={4} className={styles.title}>
            {isIndividual ? 'Индивидуальное предложение' : 'Предложение готовой работы'}
          </Title>
        </div>
      }
      closeIcon={<CloseOutlined />}
    >
      <div className={styles.body}>
        <Text type="secondary" className={styles.text}>
          {isIndividual
            ? 'Вы можете отправить покупателю индивидуальное предложение своих услуг.'
            : 'Заполните информацию, после чего в чат отправится карточка предложения.'}
        </Text>
        {isIndividual ? (
          <>
            <Text type="secondary" className={styles.textCompact}>
              1. Укажите, какие услуги и в каком объеме будут предоставлены покупателю.
            </Text>
            <Text type="secondary" className={styles.text}>
              2. Опишите свой релевантный опыт. Продемонстрируйте 1-3 примера выполнения похожей работы.
            </Text>
          </>
        ) : workTitle ? (
          <Text type="secondary" className={styles.text}>
            {workTitle}
          </Text>
        ) : null}

        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          requiredMark={false}
        >
          <Form.Item
            name="description"
            label={<Text strong>Описание</Text>}
            rules={[{ required: true, message: 'Пожалуйста, введите описание' }]}
          >
            <AppInput.TextArea 
              rows={6} 
              placeholder={isIndividual ? 'Напишите, как вы будете решать задачу клиента' : 'Опишите, что входит в работу'} 
              maxLength={2000}
              showCount
            />
          </Form.Item>

          {isIndividual ? (
            <>
              <Form.Item
                name="work_type_id"
                label={<Text strong>Тип работы</Text>}
                rules={[{ required: true, message: 'Укажите тип работы' }]}
              >
                <AppSelect
                  placeholder="Выберите тип работы"
                  loading={workTypesLoading}
                  showSearch
                  optionFilterProp="label"
                  options={workTypes
                    .filter((w) => w.is_active !== false)
                    .map((w) => ({ value: w.id, label: w.name }))}
                />
              </Form.Item>

              <Form.Item
                name="subject_id"
                label={<Text strong>Предмет</Text>}
                rules={[{ required: true, message: 'Укажите предмет' }]}
              >
                <AppSelect
                  placeholder="Выберите предмет"
                  loading={subjectsLoading}
                  showSearch
                  optionFilterProp="label"
                  options={subjects
                    .filter((s) => s.is_active !== false)
                    .map((s) => ({ value: s.id, label: s.name }))}
                />
              </Form.Item>
            </>
          ) : null}

          <Form.Item
            name="cost"
            label={<Text strong>Стоимость</Text>}
            rules={[{ required: true, message: 'Укажите стоимость' }]}
          >
            <AppInput.Number
              className={styles.fullWidth}
              formatter={value => `₽ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
              parser={value => Number((value ?? '').replace(/₽\s?|(,*)/g, ''))}
              min={500}
              max={2000000}
              placeholder="₽ 500 - 2 000 000"
            />
          </Form.Item>

          {isIndividual ? (
            <Form.Item
              name="deadline"
              label={<Text strong>Срок выполнения</Text>}
              rules={[{ required: true, message: 'Укажите срок выполнения' }]}
            >
              <AppDatePicker 
                className={styles.fullWidth}
                placeholder="Выберите дату"
                disabledDate={(current) => current && current < dayjs().endOf('day')}
              />
            </Form.Item>
          ) : (
            null
          )}

          <Form.Item className={styles.submitItem}>
            <AppButton
              variant="success"
              htmlType="submit"
              loading={loading}
              className={styles.submitButton}
            >
              Отправить предложение
            </AppButton>
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
};

export default IndividualOfferModal;
