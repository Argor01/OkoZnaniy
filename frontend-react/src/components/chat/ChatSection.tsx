import React, { useState } from 'react';
import { Card, Button, Modal, Form, Input, Select, Space, Typography, App } from 'antd';
import { PlusOutlined, WarningOutlined } from '@ant-design/icons';
import type { ChatConfig, ChatSectionApi, RoomType } from './types';
import { useChatSection } from './hooks/useChatSection';
import ChatRoomList from './ChatRoomList';
import ChatMessages from './ChatMessages';
import ChatMessageInput from './ChatMessageInput';

const { Title } = Typography;
const { Option } = Select;

interface ChatSectionProps {
  config: ChatConfig;
  api: ChatSectionApi;
  className?: string;
}

const ChatSection: React.FC<ChatSectionProps> = ({ config, api, className }) => {
  const {
    filteredRooms,
    selectedRoom,
    messages,
    messageText,
    searchText,
    loading,
    isMobile,
    setMessageText,
    setSearchText,
    selectRoom,
    sendMessage,
    createRoom,
  } = useChatSection(api);

  const { modal } = App.useApp();
  const [createRoomVisible, setCreateRoomVisible] = useState(false);
  const [createRoomForm] = Form.useForm();

  const handleCreateRoom = async () => {
    try {
      const values = await createRoomForm.validateFields();
      await createRoom({
        name: values.name,
        description: values.description,
        type: values.type as RoomType,
      });
      setCreateRoomVisible(false);
      createRoomForm.resetFields();
    } catch { /* validation error */ }
  };

  const handleReportMessage = (messageId: number, senderName: string) => {
    modal.confirm({
      title: 'Пожаловаться на сообщение',
      icon: <WarningOutlined />,
      content: `Вы уверены, что хотите пожаловаться на сообщение от ${senderName}?`,
      okText: 'Да, пожаловаться',
      cancelText: 'Отмена',
      okButtonProps: { danger: true },
      onOk() {
        import('antd').then(({ message: msg }) => {
          msg.warning(`Жалоба на сообщение #${messageId} отправлена на рассмотрение`);
        });
      },
    });
  };

  const handleFileUpload = async (file: File) => {
    if (selectedRoom && api.uploadFile) {
      try {
        await api.uploadFile(selectedRoom.id, file);
        import('antd').then(({ message: msg }) => msg.success('Файл загружен'));
      } catch {
        import('antd').then(({ message: msg }) => msg.error('Ошибка загрузки файла'));
      }
    }
    return false;
  };

  const showList = !isMobile || !selectedRoom;
  const showChat = !isMobile || !!selectedRoom;

  return (
    <Card className={className}>
      <Title level={4} style={{ marginBottom: 16 }}>{config.title}</Title>
      <div style={{ display: 'flex', height: 'calc(100vh - 300px)', minHeight: 400, border: '1px solid var(--color-border-secondary, #f0f0f0)', borderRadius: 8, overflow: 'hidden' }}>
        {showList && (
          <div style={{ width: isMobile ? '100%' : 320, borderRight: isMobile ? 'none' : '1px solid var(--color-border-secondary, #f0f0f0)', flexShrink: 0 }}>
            <ChatRoomList
              rooms={filteredRooms}
              selectedRoom={selectedRoom}
              searchText={searchText}
              loading={loading}
              onSearch={setSearchText}
              onSelectRoom={selectRoom}
              extra={
                config.allowCreateRoom !== false ? (
                  <Button
                    type="dashed"
                    icon={<PlusOutlined />}
                    block
                    style={{ marginTop: 8 }}
                    onClick={() => setCreateRoomVisible(true)}
                  >
                    Новый чат
                  </Button>
                ) : undefined
              }
            />
          </div>
        )}

        {showChat && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            {selectedRoom ? (
              <>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border-secondary, #f0f0f0)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  {isMobile && (
                    <Button size="small" onClick={() => selectRoom(null as any)}>←</Button>
                  )}
                  <Title level={5} style={{ margin: 0 }}>{selectedRoom.name}</Title>
                </div>
                <ChatMessages
                  messages={messages}
                  selectedRoomName={selectedRoom.name}
                  allowReportMessage={config.allowReportMessage}
                  onReportMessage={handleReportMessage}
                />
                <ChatMessageInput
                  messageText={messageText}
                  onChangeText={setMessageText}
                  onSend={sendMessage}
                  allowFileUpload={config.allowFileUpload}
                  onFileUpload={handleFileUpload}
                />
              </>
            ) : (
              <ChatMessages messages={[]} />
            )}
          </div>
        )}
      </div>

      <Modal
        open={createRoomVisible}
        title="Создать чат"
        onCancel={() => { setCreateRoomVisible(false); createRoomForm.resetFields(); }}
        onOk={handleCreateRoom}
        okText="Создать"
        cancelText="Отмена"
      >
        <Form form={createRoomForm} layout="vertical">
          <Form.Item name="name" label="Название" rules={[{ required: true, message: 'Введите название' }]}>
            <Input placeholder="Название чата" />
          </Form.Item>
          <Form.Item name="description" label="Описание">
            <Input.TextArea placeholder="Описание чата" autoSize={{ minRows: 2, maxRows: 4 }} />
          </Form.Item>
          <Form.Item name="type" label="Тип" initialValue="general">
            <Select>
              <Option value="general">Общий</Option>
              <Option value="department">Отдел</Option>
              <Option value="project">Проект</Option>
              <Option value="private">Личный</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default ChatSection;
