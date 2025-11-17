import React, { useState, useEffect, useRef } from 'react';
import { Form, Input, Select, Button, Upload, Space, message } from 'antd';
import { UploadOutlined, SendOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd';
import { arbitratorApi } from '../../api/arbitratorApi';
import type { SendMessageRequest } from '../../api/types';

const { TextArea } = Input;
const { Option } = Select;

interface MessageFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  claimId?: number;
  claims?: Array<{ id: number; title: string }>;
  replyTo?: { text: string; sender: string };
}

const MessageForm: React.FC<MessageFormProps> = ({
  onSuccess,
  onCancel,
  claimId,
  claims = [],
  replyTo,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const textAreaRef = useRef<any>(null);

  // Установка начального текста при ответе и фокус на поле
  useEffect(() => {
    if (replyTo) {
      form.setFieldsValue({
        text: `Ответ на сообщение от ${replyTo.sender}:\n${replyTo.text}\n\n`,
      });
      // Фокус на поле ввода после небольшой задержки
      setTimeout(() => {
        textAreaRef.current?.focus();
        // Установка курсора в конец текста
        if (textAreaRef.current?.resizableTextArea?.textArea) {
          const textArea = textAreaRef.current.resizableTextArea.textArea;
          textArea.setSelectionRange(textArea.value.length, textArea.value.length);
        }
      }, 150);
    }
  }, [replyTo, form]);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      const messageData: SendMessageRequest = {
        text: values.text,
        claim_id: values.claim_id || claimId,
        priority: values.priority,
        attachments: fileList
          .filter((file) => file.originFileObj)
          .map((file) => file.originFileObj as File),
      };

      await arbitratorApi.sendMessage(messageData);

      message.success('Сообщение успешно отправлено');
      form.resetFields();
      setFileList([]);
      // Небольшая задержка для обновления UI
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        }
      }, 100);
    } catch (error: any) {
      message.error(error?.response?.data?.detail || 'Ошибка при отправке сообщения');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      initialValues={{
        claim_id: claimId,
      }}
    >
      <Form.Item
        name="text"
        label="Текст сообщения"
        rules={[{ required: true, message: 'Введите текст сообщения' }]}
      >
        <TextArea
          ref={textAreaRef}
          rows={4}
          placeholder="Введите ваше сообщение дирекции..."
          showCount
          maxLength={2000}
        />
      </Form.Item>

      {claims.length > 0 && (
        <Form.Item
          name="claim_id"
          label="Связанное обращение (опционально)"
        >
          <Select
            placeholder="Выберите обращение"
            allowClear
            showSearch
            optionFilterProp="children"
            filterOption={(input, option) =>
              (option?.children as unknown as string)
                .toLowerCase()
                .includes(input.toLowerCase())
            }
          >
            {claims.map((claim) => (
              <Option key={claim.id} value={claim.id}>
                #{claim.id} - {claim.title}
              </Option>
            ))}
          </Select>
        </Form.Item>
      )}

      <Form.Item
        name="priority"
        label="Приоритет (опционально)"
      >
        <Select placeholder="Выберите приоритет" allowClear>
          <Option value="low">Низкий</Option>
          <Option value="medium">Средний</Option>
          <Option value="high">Высокий</Option>
        </Select>
      </Form.Item>

      <Form.Item
        name="attachments"
        label="Прикрепленные файлы (опционально)"
      >
        <Upload
          fileList={fileList}
          onChange={({ fileList }) => setFileList(fileList)}
          beforeUpload={() => false}
          multiple
        >
          <Button icon={<UploadOutlined />}>Выбрать файлы</Button>
        </Upload>
      </Form.Item>

      <Form.Item>
        <Space>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            icon={<SendOutlined />}
          >
            Отправить сообщение
          </Button>
          {onCancel && (
            <Button onClick={onCancel}>Отмена</Button>
          )}
        </Space>
      </Form.Item>
    </Form>
  );
};

export default MessageForm;

