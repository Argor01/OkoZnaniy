import React, { useState, useEffect, useRef } from 'react';
import { Form, Input, Select, Button, Upload, Space, message, Popover } from 'antd';
import { UploadOutlined, SendOutlined, SmileOutlined, PaperClipOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
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
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const textAreaRef = useRef<any>(null);
  const uploadRef = useRef<any>(null);

  
  useEffect(() => {
    if (replyTo) {
      form.setFieldsValue({
        text: `Ответ на сообщение от ${replyTo.sender}:\n${replyTo.text}\n\n`,
      });
      
      setTimeout(() => {
        textAreaRef.current?.focus();
        
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

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    const currentText = form.getFieldValue('text') || '';
    const textArea = textAreaRef.current?.resizableTextArea?.textArea;
    
    if (textArea) {
      const start = textArea.selectionStart;
      const end = textArea.selectionEnd;
      const newText = currentText.substring(0, start) + emojiData.emoji + currentText.substring(end);
      
      form.setFieldsValue({ text: newText });
      
      
      setTimeout(() => {
        const newPosition = start + emojiData.emoji.length;
        textArea.setSelectionRange(newPosition, newPosition);
        textArea.focus();
      }, 0);
    } else {
      form.setFieldsValue({ text: currentText + emojiData.emoji });
    }
    
    setEmojiPickerOpen(false);
  };

  const handleAttachClick = () => {
    uploadRef.current?.click();
  };

  const uploadProps: UploadProps = {
    fileList,
    onChange: ({ fileList }) => setFileList(fileList),
    beforeUpload: () => false,
    multiple: true,
    showUploadList: false,
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
        <div className="arbitratorMessageFormField">
          <TextArea
            ref={textAreaRef}
            rows={4}
            placeholder="Введите ваше сообщение дирекции..."
            showCount
            maxLength={2000}
          />
          <Upload {...uploadProps}>
            <Button
              type="default"
              shape="circle"
              icon={<PaperClipOutlined />}
              onClick={handleAttachClick}
              className="arbitratorMessageActionButton arbitratorMessageAttachButton"
            />
          </Upload>
          <Popover
            content={
              <EmojiPicker
                onEmojiClick={handleEmojiClick}
                width={350}
                height={400}
              />
            }
            trigger="click"
            open={emojiPickerOpen}
            onOpenChange={setEmojiPickerOpen}
            placement="bottomRight"
          >
            <Button
              type="default"
              shape="circle"
              icon={<SmileOutlined />}
              className="arbitratorMessageActionButton arbitratorMessageEmojiButton"
            />
          </Popover>
        </div>
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

      {fileList.length > 0 && (
        <Form.Item label="Прикрепленные файлы">
          <Upload
            fileList={fileList}
            onChange={({ fileList }) => setFileList(fileList)}
            beforeUpload={() => false}
            multiple
            onRemove={(file) => {
              setFileList(fileList.filter((f) => f.uid !== file.uid));
            }}
          >
            <Button icon={<UploadOutlined />}>Добавить еще файлы</Button>
          </Upload>
        </Form.Item>
      )}

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

