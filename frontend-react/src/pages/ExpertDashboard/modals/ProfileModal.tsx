import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Upload, message, InputNumber as AntInputNumber } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '../../../api/auth';
import apiClient from '../../../api/client';
import { UserProfile } from '../types';
import SkillsSelect from '../../../components/SkillsSelect';
import styles from '../ExpertDashboard.module.css';

interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
  profile: UserProfile | null;
  userProfile?: { role?: string; avatar?: string } | null;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ visible, onClose, profile, userProfile }) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const isExpert = userProfile?.role === 'expert';
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 575);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 575);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Блокировка скролла основного контента при открытом модальном окне
  useEffect(() => {
    if (visible && isMobile) {
      document.body.style.overflow = 'hidden';
      // Убираем position: fixed, так как это может ломать скролл на некоторых устройствах
      // и вызывать "прыжок" страницы вверх
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [visible, isMobile]);

  useEffect(() => {
    if (visible && profile) {
      const toNumberOrUndefined = (value: unknown) => {
        if (value === null || value === undefined || value === '') return undefined;
        if (typeof value === 'number') return value;
        const num = Number(value);
        return Number.isFinite(num) ? num : undefined;
      };

      // Преобразуем строку навыков в массив для Select
      const formValues: Record<string, unknown> = { ...profile };
      formValues.experience_years = toNumberOrUndefined(profile.experience_years);
      formValues.hourly_rate = toNumberOrUndefined(profile.hourly_rate);
      if (profile.skills && typeof profile.skills === 'string') {
        formValues.skills = profile.skills.split(',').map(s => s.trim()).filter(s => s);
      }
      form.setFieldsValue(formValues);
    }
    // Устанавливаем текущую аватарку при открытии модального окна
    if (visible) {
      if (userProfile?.avatar && userProfile.avatar !== '') {
        setImageUrl(userProfile.avatar);
      } else {
        setImageUrl(null);
      }
    }
  }, [visible, profile, userProfile, form]);

  return (
    <Modal
      style={isMobile ? { padding: 0 } : { top: 20 }}
      title={
        <div style={{ 
          fontSize: isMobile ? 18 : 24, 
          fontWeight: 600, 
          background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 50%, #40a9ff 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          Редактировать профиль
        </div>
      }
      open={visible}
      onCancel={onClose}
      onOk={() => form.submit()}
      width={isMobile ? '100%' : 750}
      okText="Сохранить"
      cancelText="Отмена"
      okButtonProps={{
        className: styles.buttonPrimary,
        size: isMobile ? 'middle' : 'large',
        style: { 
          borderRadius: isMobile ? 8 : 12,
          height: isMobile ? 40 : 44,
          fontSize: isMobile ? 14 : 16,
          fontWeight: 500
        }
      }}
      cancelButtonProps={{
        className: styles.buttonSecondary,
        size: isMobile ? 'middle' : 'large',
        style: { 
          borderRadius: isMobile ? 8 : 12,
          height: isMobile ? 40 : 44,
          fontSize: isMobile ? 14 : 16,
          fontWeight: 500
        }
      }}
      styles={{
        mask: {
          backdropFilter: isMobile ? 'none' : 'blur(8px)',
          WebkitBackdropFilter: isMobile ? 'none' : 'blur(8px)',
          backgroundColor: 'rgba(0, 0, 0, 0.3)'
        },
        content: { 
          borderRadius: isMobile ? 0 : 24, 
          padding: 0,
          overflow: 'hidden',
          background: isMobile ? '#ffffff' : 'rgba(255, 255, 255, 0.95)',
          backdropFilter: isMobile ? 'none' : 'blur(10px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
          margin: isMobile ? 0 : 'auto',
          maxWidth: '100%',
          // height и maxHeight теперь управляются через CSS класс .ant-modal-content
          display: 'flex',
          flexDirection: 'column'
        },
        header: {
          background: isMobile ? '#ffffff' : 'rgba(255, 255, 255, 0.95)',
          backdropFilter: isMobile ? 'none' : 'blur(10px)',
          padding: isMobile ? '16px 20px' : '24px 32px',
          borderBottom: '1px solid rgba(102, 126, 234, 0.1)',
          borderRadius: isMobile ? 0 : '24px 24px 0 0',
          flexShrink: 0 // Заголовок не должен сжиматься
        },
        body: {
          padding: isMobile ? '20px 24px' : '32px',
          background: isMobile ? '#ffffff' : 'rgba(255, 255, 255, 0.95)',
          overflowY: 'auto',
          flex: '1 1 auto', // Важно для правильного скролла
          minHeight: 0 // Критично для Flexbox скролла
        },
        footer: {
          padding: isMobile ? '16px 20px' : '24px 32px',
          background: isMobile ? '#ffffff' : 'rgba(255, 255, 255, 0.95)',
          borderTop: '1px solid rgba(102, 126, 234, 0.1)',
          borderRadius: isMobile ? 0 : '0 0 24px 24px',
          flexShrink: 0 // Футер не должен сжиматься
        }
      }}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={profile || {}}
        onFinish={async (values) => {
          try {
            type UpdateProfilePayload = {
              username?: string;
              first_name?: string;
              last_name?: string;
              bio?: string;
              experience_years?: number;
              education?: string;
              hourly_rate?: number;
              portfolio_url?: string;
              skills?: string;
            };
            // Подготавливаем данные для отправки
            const profileData: UpdateProfilePayload = {
              username: values.username,
              first_name: values.first_name,
              last_name: values.last_name,
              bio: values.bio,
            };

            // Добавляем поля только для экспертов
            if (userProfile?.role === 'expert') {
              profileData.experience_years = values.experience_years;
              profileData.education = values.education;
              profileData.hourly_rate = values.hourly_rate;
              profileData.portfolio_url = values.portfolio_url;
              
              // Преобразуем массив навыков в строку
              if (Array.isArray(values.skills)) {
                profileData.skills = values.skills.join(', ');
              } else if (values.skills) {
                profileData.skills = values.skills;
              }
            }

            const result = await authApi.updateProfile(profileData);
            message.success('Профиль обновлен');
            onClose();
            queryClient.setQueryData(['user-profile'], result);
            await queryClient.invalidateQueries({ queryKey: ['user-profile'] });
            await queryClient.refetchQueries({ queryKey: ['user-profile'] });
          } catch (e: unknown) {
            const errorData = (e as { response?: { data?: unknown } })?.response?.data;
            if (errorData && typeof errorData === 'object' && !Array.isArray(errorData)) {
              Object.entries(errorData as Record<string, unknown>).forEach(([field, messages]) => {
                if (Array.isArray(messages)) {
                  messages.forEach((msg) => message.error(`${field}: ${String(msg)}`));
                  return;
                }
                message.error(`${field}: ${String(messages)}`);
              });
              return;
            }
            const detail =
              (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
              'Не удалось обновить профиль';
            message.error(detail);
          }
        }}
      >
        <Form.Item label="Аватар" name="avatar">
          <Upload
            name="avatar"
            listType="picture-card"
            showUploadList={false}
            beforeUpload={(file) => {
              const isImage = file.type.startsWith('image/');
              if (!isImage) {
                message.error('Можно загружать только изображения!');
                return false;
              }
              const isLt2M = file.size / 1024 / 1024 < 2;
              if (!isLt2M) {
                message.error('Размер файла должен быть меньше 2MB!');
                return false;
              }
              // Показываем превью сразу после выбора файла
              const reader = new FileReader();
              reader.onload = (e) => {
                setImageUrl(e.target?.result as string);
              };
              reader.readAsDataURL(file);
              return true;
            }}
            customRequest={async ({ file, onSuccess, onError }) => {
              try {
                const formData = new FormData();
                formData.append('avatar', file as File);

                const { data: result } = await apiClient.patch('/users/update_me/', formData, {
                  headers: {
                    'Content-Type': 'multipart/form-data',
                  },
                });

                if (result) {
                  form.setFieldsValue({ avatar: result.avatar });
                  onSuccess?.(result);
                  message.success('Аватар обновлен!');
                  // Инвалидируем кэш и принудительно перезапрашиваем данные
                  queryClient.setQueryData(['user-profile'], result);
                  await queryClient.invalidateQueries({ queryKey: ['user-profile'] });
                  await queryClient.refetchQueries({ queryKey: ['user-profile'] });
                } else {
                  throw new Error('Ошибка загрузки');
                }
              } catch (error) {
                onError?.(error as Error);
                message.error('Не удалось загрузить аватар');
              }
            }}
          >
            {imageUrl ? (
              <img 
                src={imageUrl} 
                alt="avatar" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={() => setImageUrl(null)}
              />
            ) : (
              <div>
                <UserOutlined />
                <div style={{ marginTop: 8 }}>Загрузить</div>
              </div>
            )}
          </Upload>
        </Form.Item>
        <Form.Item 
          label="Никнейм" 
          name="username"
          rules={[
            { required: true, message: 'Введите никнейм' },
            { min: 3, message: 'Минимум 3 символа' },
            { max: 30, message: 'Максимум 30 символов' },
            { 
              pattern: /^[a-zA-Z0-9а-яА-ЯёЁ@.+\-_]+$/, 
              message: 'Никнейм может содержать только буквы, цифры и символы @.+-_' 
            }
          ]}
          extra="Используйте подчеркивание вместо пробела"
        >
          <Input 
            className={styles.inputField} 
            size="large" 
            placeholder="Ваш_никнейм"
            onChange={(e) => {
              // Автоматически заменяем пробелы на подчеркивания
              const value = e.target.value.replace(/\s+/g, '_');
              form.setFieldValue('username', value);
            }}
          />
        </Form.Item>
        <Form.Item label="О себе" name="bio">
          <Input.TextArea 
            autoSize={{ minRows: 4, maxRows: 10 }}
            placeholder={isExpert ? "Расскажите о себе, своем опыте и специализации" : "Расскажите немного о себе"} 
            className={styles.textareaField} 
            style={{ fontSize: 15 }} 
          />
        </Form.Item>
        
        {/* Поля только для экспертов */}
        {isExpert && (
          <>
            <div style={{ 
              padding: '16px', 
              backgroundColor: '#f0f9ff', 
              borderRadius: '8px', 
              marginBottom: '16px',
              border: '1px solid #0ea5e9'
            }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#0369a1' }}>Профессиональная информация</h4>
              <p style={{ margin: 0, fontSize: '14px', color: '#0369a1' }}>
                Заполните дополнительные поля для экспертов
              </p>
            </div>
            <div style={{ display: 'flex', gap: 16, flexDirection: isMobile ? 'column' : 'row' }}>
              <Form.Item 
                label="Опыт работы (лет)" 
                name="experience_years" 
                style={{ flex: 1 }}
                rules={[
                  { type: 'number', min: 0, max: 90, message: 'Опыт должен быть от 0 до 90 лет' }
                ]}
              >
                <AntInputNumber 
                  min={0} 
                  max={90} 
                  precision={0}
                  parser={(value) => {
                    if (!value) return 0;
                    const parsed = value.replace(/\D/g, '');
                    return parsed ? Number(parsed) : 0;
                  }}
                  formatter={(value) => value !== undefined && value !== null ? String(value) : ''}
                  controls={false}
                  style={{ width: '100%'}} 
                  className={styles.inputNumberField} 
                  size="large"
                  placeholder="0"
                  onKeyPress={(e) => {
                    if (!/[0-9]/.test(e.key)) {
                      e.preventDefault();
                    }
                  }}
                />
              </Form.Item>
              <Form.Item 
                label="Почасовая ставка (₽)" 
                name="hourly_rate" 
                style={{ flex: 1 }}
                rules={[
                  { type: 'number', min: 0, max: 100000, message: 'Ставка должна быть от 0 до 100000 ₽' }
                ]}
              >
                <AntInputNumber 
                  min={0} 
                  max={100000}
                  step={100}
                  precision={0}
                  parser={(value) => {
                    if (!value) return 0;
                    const parsed = value.replace(/\D/g, '');
                    return parsed ? Number(parsed) : 0;
                  }}
                  formatter={(value) => value !== undefined && value !== null ? String(value) : ''}
                  controls={false}
                  style={{ width: '100%' }} 
                  className={styles.inputNumberField} 
                  size="large"
                  placeholder="0"
                  onKeyPress={(e) => {
                    if (!/[0-9]/.test(e.key)) {
                      e.preventDefault();
                    }
                  }}
                />
              </Form.Item>
            </div>
            <Form.Item label="Образование" name="education">
              <Input.TextArea rows={3} placeholder="Укажите ваше образование и квалификации" className={styles.textareaField} style={{ fontSize: 15 }} />
            </Form.Item>
            <Form.Item label="Навыки" name="skills">
              <SkillsSelect />
            </Form.Item>
            <Form.Item label="Портфолио (ссылка)" name="portfolio_url">
              <Input placeholder="https://example.com/portfolio" className={styles.inputField} size="large" />
            </Form.Item>
          </>
        )}
      </Form>
    </Modal>
  );
};

export default ProfileModal;
