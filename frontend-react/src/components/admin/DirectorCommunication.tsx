import React, { useState, useRef } from 'react';
import { Card, Input, Button, Space, Typography, Divider, Empty, Tag, message, Grid, Tabs, Popover, Upload } from 'antd';
import { SendOutlined, MessageOutlined, SmileOutlined, PaperClipOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import dayjs from 'dayjs';
import {
  getMockDirectorCommunications,
  getMockClaims,
} from '../../mocks/claimsData';
import {
  getClaimPriorityLabel,
  getClaimPriorityColor,
  getDirectorCommunicationStatusLabel,
} from '../../types/claims';

const { Title, Text } = Typography;
const { TextArea } = Input;

const DirectorCommunication: React.FC = () => {
  const { useBreakpoint } = Grid;
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [selectedCommunication, setSelectedCommunication] = useState<number | null>(null);
  const [messageText, setMessageText] = useState('');
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const uploadRef = useRef<any>(null);

  const communications = getMockDirectorCommunications();
  const selectedComm = communications.find((c) => c.id === selectedCommunication);

  const handleSendMessage = () => {
    if (!messageText.trim()) {
      message.warning('Введите сообщение');
      return;
    }
    message.success('Сообщение отправлено');
    setMessageText('');
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setMessageText(messageText + emojiData.emoji);
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

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      open: 'blue',
      in_discussion: 'processing',
      resolved: 'success',
      closed: 'default',
    };
    return colors[status] || 'default';
  };

  
  if (isMobile) {
    return (
      <div>
        <Card>
          <Tabs
            activeKey={selectedCommunication ? 'chat' : 'list'}
            onChange={(key) => {
              if (key === 'list') {
                setSelectedCommunication(null);
              }
            }}
            items={[
              {
                key: 'list',
                label: `Обсуждения (${communications.length})`,
                children: (
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    {communications.map((comm) => (
                      <Card
                        key={comm.id}
                        size="small"
                        hoverable
                        onClick={() => setSelectedCommunication(comm.id)}
                      >
                        <Space direction="vertical" size={4} style={{ width: '100%' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text strong style={{ fontSize: '13px' }}>
                              #{comm.id}
                            </Text>
                            {comm.unreadCount > 0 && (
                              <Tag color="red" style={{ fontSize: '11px', padding: '0 6px' }}>
                                {comm.unreadCount}
                              </Tag>
                            )}
                          </div>
                          <Text ellipsis style={{ fontSize: '12px' }}>
                            {comm.subject}
                          </Text>
                          <Space size={4} wrap>
                            <Tag color={getClaimPriorityColor(comm.priority)} style={{ fontSize: '11px', margin: 0 }}>
                              {getClaimPriorityLabel(comm.priority)}
                            </Tag>
                            <Tag color={getStatusColor(comm.status)} style={{ fontSize: '11px', margin: 0 }}>
                              {getDirectorCommunicationStatusLabel(comm.status)}
                            </Tag>
                          </Space>
                        </Space>
                      </Card>
                    ))}
                  </Space>
                ),
              },
              ...(selectedComm
                ? [
                    {
                      key: 'chat',
                      label: `#${selectedComm.id}`,
                      children: (
                        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                          <div>
                            <Title level={5} style={{ marginBottom: 8, fontSize: '14px' }}>
                              {selectedComm.subject}
                            </Title>
                            <Space wrap size={4}>
                              <Tag color={getClaimPriorityColor(selectedComm.priority)} style={{ fontSize: '11px' }}>
                                {getClaimPriorityLabel(selectedComm.priority)}
                              </Tag>
                              <Tag color={getStatusColor(selectedComm.status)} style={{ fontSize: '11px' }}>
                                {getDirectorCommunicationStatusLabel(selectedComm.status)}
                              </Tag>
                            </Space>
                          </div>

                          <div
                            style={{
                              maxHeight: '400px',
                              overflowY: 'auto',
                              padding: '8px',
                              backgroundColor: '#fafafa',
                              borderRadius: '8px',
                            }}
                          >
                            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                              {selectedComm.messages.map((msg) => (
                                <div
                                  key={msg.id}
                                  style={{
                                    padding: '10px',
                                    background: msg.author.role === 'director' ? '#e6f7ff' : '#fff',
                                    borderRadius: '8px',
                                    borderLeft: `3px solid ${msg.author.role === 'director' ? '#1890ff' : '#d9d9d9'}`,
                                  }}
                                >
                                  <div style={{ marginBottom: 6 }}>
                                    <Space size={6}>
                                      <Text strong style={{ fontSize: '12px' }}>
                                        {msg.author.username}
                                      </Text>
                                      {msg.author.role === 'director' && (
                                        <Tag color="purple" style={{ fontSize: '10px', margin: 0 }}>
                                          Дирекция
                                        </Tag>
                                      )}
                                    </Space>
                                    <Text type="secondary" style={{ fontSize: '10px', display: 'block' }}>
                                      {dayjs(msg.createdAt).format('DD.MM HH:mm')}
                                    </Text>
                                  </div>
                                  <Text style={{ fontSize: '12px', whiteSpace: 'pre-wrap' }}>
                                    {msg.message}
                                  </Text>
                                </div>
                              ))}
                            </Space>
                          </div>

                          {selectedComm.decision && (
                            <div
                              style={{
                                padding: '10px',
                                background: '#f6ffed',
                                borderRadius: '8px',
                                border: '1px solid #b7eb8f',
                              }}
                            >
                              <Text strong style={{ display: 'block', marginBottom: 6, fontSize: '12px' }}>
                                Решение:
                              </Text>
                              <Text style={{ fontSize: '12px' }}>{selectedComm.decision}</Text>
                            </div>
                          )}

                          {selectedComm.status !== 'resolved' && selectedComm.status !== 'closed' && (
                            <div style={{ position: 'relative' }}>
                              <Space.Compact style={{ width: '100%' }}>
                                <TextArea
                                  placeholder="Сообщение..."
                                  value={messageText}
                                  onChange={(e) => setMessageText(e.target.value)}
                                  rows={2}
                                  style={{ resize: 'none', fontSize: '13px', paddingRight: '50px' }}
                                />
                                <Button
                                  type="primary"
                                  icon={<SendOutlined />}
                                  onClick={handleSendMessage}
                                  style={{ height: 'auto' }}
                                />
                              </Space.Compact>
                              <Popover
                                content={
                                  <EmojiPicker
                                    onEmojiClick={handleEmojiClick}
                                    width={300}
                                    height={350}
                                  />
                                }
                                trigger="click"
                                open={emojiPickerOpen}
                                onOpenChange={setEmojiPickerOpen}
                                placement="topRight"
                              >
                                <Button
                                  type="default"
                                  shape="circle"
                                  icon={<SmileOutlined />}
                                  style={{
                                    position: 'absolute',
                                    bottom: 8,
                                    right: 50,
                                    width: 32,
                                    height: 32,
                                    border: '1px solid #d1d5db',
                                    background: '#fff',
                                    zIndex: 1,
                                  }}
                                />
                              </Popover>
                            </div>
                          )}
                        </Space>
                      ),
                    },
                  ]
                : []),
            ]}
          />
        </Card>
      </div>
    );
  }

  
  return (
    <div>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ width: '350px', borderRight: '1px solid #f0f0f0', paddingRight: '16px' }}>
              <Title level={5}>Обсуждения ({communications.length})</Title>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                {communications.map((comm) => (
                  <Card
                    key={comm.id}
                    size="small"
                    hoverable
                    onClick={() => setSelectedCommunication(comm.id)}
                    style={{
                      cursor: 'pointer',
                      border: selectedCommunication === comm.id ? '2px solid #1890ff' : undefined,
                    }}
                  >
                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text strong style={{ fontSize: '13px' }}>
                          #{comm.id}
                        </Text>
                        {comm.unreadCount > 0 && (
                          <Tag color="red" style={{ fontSize: '11px', padding: '0 6px' }}>
                            {comm.unreadCount} новых
                          </Tag>
                        )}
                      </div>
                      <Text ellipsis style={{ fontSize: '12px' }}>
                        {comm.subject}
                      </Text>
                      <Space size={4}>
                        <Tag color={getClaimPriorityColor(comm.priority)} style={{ fontSize: '11px', margin: 0 }}>
                          {getClaimPriorityLabel(comm.priority)}
                        </Tag>
                        <Tag color={getStatusColor(comm.status)} style={{ fontSize: '11px', margin: 0 }}>
                          {getDirectorCommunicationStatusLabel(comm.status)}
                        </Tag>
                      </Space>
                      <Text type="secondary" style={{ fontSize: '11px' }}>
                        {dayjs(comm.updatedAt).format('DD.MM.YYYY HH:mm')}
                      </Text>
                    </Space>
                  </Card>
                ))}
              </Space>
            </div>

            
            <div style={{ flex: 1 }}>
              {!selectedComm ? (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <Empty
                    description="Выберите обсуждение из списка слева"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                </div>
              ) : (
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  
                  <div>
                    <Title level={5} style={{ marginBottom: 8 }}>
                      {selectedComm.subject}
                    </Title>
                    <Space>
                      <Tag color={getClaimPriorityColor(selectedComm.priority)}>
                        {getClaimPriorityLabel(selectedComm.priority)}
                      </Tag>
                      <Tag color={getStatusColor(selectedComm.status)}>
                        {getDirectorCommunicationStatusLabel(selectedComm.status)}
                      </Tag>
                      {selectedComm.relatedClaim && (
                        <Tag color="blue">Обращение #{selectedComm.relatedClaim.id}</Tag>
                      )}
                    </Space>
                  </div>

                  <Divider style={{ margin: '8px 0' }} />

                  <div
                    style={{
                      maxHeight: '400px',
                      overflowY: 'auto',
                      padding: '8px',
                      backgroundColor: '#fafafa',
                      borderRadius: '8px',
                    }}
                  >
                    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                      {selectedComm.messages.map((msg) => (
                        <div
                          key={msg.id}
                          style={{
                            padding: '12px',
                            background: msg.author.role === 'director' ? '#e6f7ff' : '#fff',
                            borderRadius: '8px',
                            borderLeft: `3px solid ${msg.author.role === 'director' ? '#1890ff' : '#d9d9d9'}`,
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              marginBottom: 8,
                            }}
                          >
                            <Space size={8}>
                              <Text strong style={{ fontSize: '13px' }}>
                                {msg.author.username}
                              </Text>
                              {msg.author.role === 'director' && (
                                <Tag color="purple" style={{ fontSize: '11px', margin: 0 }}>
                                  Дирекция
                                </Tag>
                              )}
                            </Space>
                            <Text type="secondary" style={{ fontSize: '11px' }}>
                              {dayjs(msg.createdAt).format('DD.MM HH:mm')}
                            </Text>
                          </div>
                          <Text style={{ fontSize: '13px', whiteSpace: 'pre-wrap' }}>
                            {msg.message}
                          </Text>
                        </div>
                      ))}
                    </Space>
                  </div>

                  
                  {selectedComm.decision && (
                    <div
                      style={{
                        padding: '12px',
                        background: '#f6ffed',
                        borderRadius: '8px',
                        border: '1px solid #b7eb8f',
                      }}
                    >
                      <Text strong style={{ display: 'block', marginBottom: 8 }}>
                        Решение:
                      </Text>
                      <Text style={{ fontSize: '13px' }}>{selectedComm.decision}</Text>
                    </div>
                  )}

                  
                  {selectedComm.status !== 'resolved' && selectedComm.status !== 'closed' && (
                    <>
                      <Divider style={{ margin: '8px 0' }} />
                      <div style={{ position: 'relative' }}>
                        <Space.Compact style={{ width: '100%' }}>
                          <TextArea
                            placeholder="Введите ваше сообщение..."
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                            rows={3}
                            style={{ resize: 'none', paddingRight: '50px' }}
                          />
                          <Button
                            type="primary"
                            icon={<SendOutlined />}
                            onClick={handleSendMessage}
                            style={{ height: 'auto' }}
                          >
                            Отправить
                          </Button>
                        </Space.Compact>
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
                          placement="topRight"
                        >
                          <Button
                            type="default"
                            shape="circle"
                            icon={<SmileOutlined />}
                            style={{
                              position: 'absolute',
                              bottom: 8,
                              right: 100,
                              width: 40,
                              height: 40,
                              border: '1px solid #d1d5db',
                              background: '#fff',
                              zIndex: 1,
                            }}
                          />
                        </Popover>
                      </div>
                    </>
                  )}
                </Space>
              )}
            </div>
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default DirectorCommunication;
