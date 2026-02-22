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

  
  useEffect(() => {
    if (visible && isMobile) {
      document.body.style.overflow = 'hidden';
      
      
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

      
      const formValues: Record<string, unknown> = { ...profile };
      formValues.experience_years = toNumberOrUndefined(profile.experience_years);
      formValues.hourly_rate = toNumberOrUndefined(profile.hourly_rate);
      if (profile.skills && typeof profile.skills === 'string') {
        formValues.skills = profile.skills.split(',').map(s => s.trim()).filter(s => s);
      }
      form.setFieldsValue(formValues);
    }
    
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
        <div className={`${styles.profileModalTitle} ${isMobile ? styles.profileModalTitleMobile : styles.profileModalTitleDesktop}`}>
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
        className: `${styles.buttonPrimary} ${styles.profileModalButton} ${isMobile ? styles.profileModalButtonMobile : styles.profileModalButtonDesktop}`,
        size: isMobile ? 'middle' : 'large',
      }}
      cancelButtonProps={{
        className: `${styles.buttonSecondary} ${styles.profileModalButton} ${isMobile ? styles.profileModalButtonMobile : styles.profileModalButtonDesktop}`,
        size: isMobile ? 'middle' : 'large',
      }}
      wrapClassName={`${styles.profileModalWrap} ${isMobile ? styles.profileModalWrapMobile : styles.profileModalWrapDesktop}`}
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
            
            const profileData: UpdateProfilePayload = {
              username: values.username,
              first_name: values.first_name,
              last_name: values.last_name,
              bio: values.bio,
            };

            
            if (userProfile?.role === 'expert') {
              profileData.experience_years = values.experience_years;
              profileData.education = values.education;
              profileData.hourly_rate = values.hourly_rate;
              profileData.portfolio_url = values.portfolio_url;
              
              
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
                className={styles.profileModalAvatarImage}
                onError={() => setImageUrl(null)}
              />
            ) : (
              <div>
                <UserOutlined />
                <div className={styles.profileModalUploadLabel}>Загрузить</div>
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
              const value = e.target.value.replace(/\s+/g, '_');
              form.setFieldValue('username', value);
            }}
          />
        </Form.Item>
        <Form.Item label="О себе" name="bio">
          <Input.TextArea 
            autoSize={{ minRows: 4, maxRows: 10 }}
            placeholder={isExpert ? "Расскажите о себе, своем опыте и специализации" : "Расскажите немного о себе"} 
            className={`${styles.textareaField} ${styles.profileModalTextarea}`} 
          />
        </Form.Item>
        
        
        {isExpert && (
          <>
            <div className={styles.profileModalExpertInfo}>
              <h4 className={styles.profileModalExpertTitle}>Профессиональная информация</h4>
              <p className={styles.profileModalExpertText}>
                Заполните дополнительные поля для экспертов
              </p>
            </div>
            <div className={`${styles.profileModalExpertGrid} ${isMobile ? styles.profileModalExpertGridMobile : ''}`}>
              <Form.Item 
                label="Опыт работы (лет)" 
                name="experience_years" 
                className={styles.profileModalFlexField}
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
                  className={`${styles.inputNumberField} ${styles.profileModalFullWidth}`} 
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
                className={styles.profileModalFlexField}
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
                  className={`${styles.inputNumberField} ${styles.profileModalFullWidth}`} 
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
              <Input.TextArea
                rows={3}
                placeholder="Укажите ваше образование и квалификации"
                className={`${styles.textareaField} ${styles.profileModalTextarea}`}
              />
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
