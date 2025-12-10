import React from 'react';
import { Modal, Form, Input, Upload, message, InputNumber as AntInputNumber } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '../../../api/auth';
import { UserProfile } from '../types';
import SkillsSelect from '../../../components/SkillsSelect';
import styles from '../ExpertDashboard.module.css';

interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
  profile: UserProfile | null;
  userProfile?: any;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ visible, onClose, profile, userProfile }) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const isExpert = userProfile?.role === 'expert';

  React.useEffect(() => {
    if (visible && profile) {
      // Преобразуем строку навыков в массив для Select
      const formValues: any = { ...profile };
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
      title={
        <div style={{ 
          fontSize: 24, 
          fontWeight: 600, 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
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
      width={750}
      okText="Сохранить"
      cancelText="Отмена"
      okButtonProps={{
        className: styles.buttonPrimary,
        size: 'large',
        style: { 
          borderRadius: 12,
          height: 44,
          fontSize: 16,
          fontWeight: 500
        }
      }}
      cancelButtonProps={{
        className: styles.buttonSecondary,
        size: 'large',
        style: { 
          borderRadius: 12,
          height: 44,
          fontSize: 16,
          fontWeight: 500
        }
      }}
      styles={{
        mask: {
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          backgroundColor: 'rgba(0, 0, 0, 0.3)'
        },
        content: { 
          borderRadius: 24, 
          padding: 0,
          overflow: 'hidden',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)'
        },
        header: {
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          padding: '24px 32px',
          borderBottom: '1px solid rgba(102, 126, 234, 0.1)',
          borderRadius: '24px 24px 0 0'
        },
        body: {
          padding: '32px',
          background: 'rgba(255, 255, 255, 0.95)'
        },
        footer: {
          padding: '24px 32px',
          background: 'rgba(255, 255, 255, 0.95)',
          borderTop: '1px solid rgba(102, 126, 234, 0.1)',
          borderRadius: '0 0 24px 24px'
        }
      }}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={profile || {}}
        onFinish={async (values) => {
          try {
            // Подготавливаем данные для отправки
            const profileData: any = {
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

            console.log('Отправляем данные:', profileData);
            const result = await authApi.updateProfile(profileData);
            console.log('Результат обновления:', result);
            message.success('Профиль обновлен');
            onClose();
            await queryClient.invalidateQueries({ queryKey: ['user-profile'] });
            await queryClient.refetchQueries({ queryKey: ['user-profile'] });
            console.log('Кэш обновлен');
          } catch (e: any) {
            console.error('Ошибка:', e);
            console.error('Детали ошибки:', e?.response?.data);
            const errorData = e?.response?.data;
            if (errorData && typeof errorData === 'object') {
              Object.entries(errorData).forEach(([field, messages]) => {
                if (Array.isArray(messages)) {
                  messages.forEach(msg => message.error(`${field}: ${msg}`));
                } else {
                  message.error(`${field}: ${messages}`);
                }
              });
            } else {
              message.error(e?.response?.data?.detail || 'Не удалось обновить профиль');
            }
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
                
                const response = await fetch('http://127.0.0.1:8000/api/users/update_me/', {
                  method: 'PATCH',
                  headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                  },
                  body: formData,
                });
                
                if (response.ok) {
                  const result = await response.json();
                  form.setFieldsValue({ avatar: result.avatar });
                  onSuccess?.(result);
                  message.success('Аватар обновлен!');
                  // Инвалидируем кэш и принудительно перезапрашиваем данные
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
            rows={4} 
            placeholder={isExpert ? "Расскажите о себе, своем опыте и специализации" : "Расскажите немного о себе"} 
            className={styles.textareaField} 
            style={{ fontSize: 15 }} 
          />
        </Form.Item>
        
        {/* Поля только для экспертов */}
        {isExpert && (
          <>
            <div style={{ display: 'flex', gap: 16 }}>
              <Form.Item label="Опыт работы (лет)" name="experience_years" style={{ flex: 1 }}>
                <AntInputNumber 
                  min={0} 
                  max={90} 
                  precision={0}
                  parser={(value) => {
                    const parsed = value?.replace(/\D/g, '');
                    return parsed ? Number(parsed) : 0;
                  }}
                  style={{ width: '100%' }} 
                  className={styles.inputField} 
                  size="large"
                  placeholder="0"
                />
              </Form.Item>
              <Form.Item label="Почасовая ставка (₽)" name="hourly_rate" style={{ flex: 1 }}>
                <AntInputNumber 
                  min={0} 
                  step={100}
                  precision={0}
                  parser={(value) => {
                    const parsed = value?.replace(/\D/g, '');
                    return parsed ? Number(parsed) : 0;
                  }}
                  style={{ width: '100%' }} 
                  className={styles.inputField} 
                  size="large"
                  placeholder="0"
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
