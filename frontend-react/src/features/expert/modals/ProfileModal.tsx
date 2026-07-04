import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Upload, message, InputNumber as AntInputNumber } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/features/auth/api/auth';
import apiClient from '@/api/client';
import { UserProfile } from '../types';
import SkillsSelect from '../components/inputs/SkillsSelectNew';
import { useUserUpdate } from '@/hooks/useUserUpdate';
import styles from './ProfileModal.module.css';

const TEXT = {
  title: '\u0420\u0435\u0434\u0430\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u043f\u0440\u043e\u0444\u0438\u043b\u044c',
  save: '\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c',
  cancel: '\u041e\u0442\u043c\u0435\u043d\u0430',
  avatar: '\u0410\u0432\u0430\u0442\u0430\u0440',
  upload: '\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c',
  username: '\u041d\u0438\u043a\u043d\u0435\u0439\u043c',
  usernameRequired: '\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043d\u0438\u043a\u043d\u0435\u0439\u043c',
  usernameMin: '\u041c\u0438\u043d\u0438\u043c\u0443\u043c 3 \u0441\u0438\u043c\u0432\u043e\u043b\u0430',
  usernameMax: '\u041c\u0430\u043a\u0441\u0438\u043c\u0443\u043c 150 \u0441\u0438\u043c\u0432\u043e\u043b\u043e\u0432',
  usernameExtra:
    '\u041c\u043e\u0436\u043d\u043e \u0438\u0441\u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u044c \u043f\u0440\u043e\u0431\u0435\u043b\u044b \u0438 \u0441\u043f\u0435\u0446\u0438\u0430\u043b\u044c\u043d\u044b\u0435 \u0441\u0438\u043c\u0432\u043e\u043b\u044b',
  usernamePlaceholder: '\u0412\u0430\u0448 \u043d\u0438\u043a\u043d\u0435\u0439\u043c',
  bio: '\u041e \u0441\u0435\u0431\u0435',
  bioExpert:
    '\u0420\u0430\u0441\u0441\u043a\u0430\u0436\u0438\u0442\u0435 \u043e \u0441\u0435\u0431\u0435, \u0441\u0432\u043e\u0435\u043c \u043e\u043f\u044b\u0442\u0435 \u0438 \u0441\u043f\u0435\u0446\u0438\u0430\u043b\u0438\u0437\u0430\u0446\u0438\u0438',
  bioDefault: '\u0420\u0430\u0441\u0441\u043a\u0430\u0436\u0438\u0442\u0435 \u043d\u0435\u043c\u043d\u043e\u0433\u043e \u043e \u0441\u0435\u0431\u0435',
  profileUpdated: '\u041f\u0440\u043e\u0444\u0438\u043b\u044c \u043e\u0431\u043d\u043e\u0432\u043b\u0435\u043d',
  profileUpdateError: '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0431\u043d\u043e\u0432\u0438\u0442\u044c \u043f\u0440\u043e\u0444\u0438\u043b\u044c',
  imagesOnly: '\u041c\u043e\u0436\u043d\u043e \u0437\u0430\u0433\u0440\u0443\u0436\u0430\u0442\u044c \u0442\u043e\u043b\u044c\u043a\u043e \u0438\u0437\u043e\u0431\u0440\u0430\u0436\u0435\u043d\u0438\u044f!',
  maxFileSize: '\u0420\u0430\u0437\u043c\u0435\u0440 \u0444\u0430\u0439\u043b\u0430 \u0434\u043e\u043b\u0436\u0435\u043d \u0431\u044b\u0442\u044c \u043c\u0435\u043d\u044c\u0448\u0435 2MB!',
  uploadFailed: '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0430\u0432\u0430\u0442\u0430\u0440',
  uploadSuccess: '\u0410\u0432\u0430\u0442\u0430\u0440 \u043e\u0431\u043d\u043e\u0432\u043b\u0435\u043d!',
  expertInfoTitle: '\u041f\u0440\u043e\u0444\u0435\u0441\u0441\u0438\u043e\u043d\u0430\u043b\u044c\u043d\u0430\u044f \u0438\u043d\u0444\u043e\u0440\u043c\u0430\u0446\u0438\u044f',
  expertInfoText:
    '\u0417\u0430\u043f\u043e\u043b\u043d\u0438\u0442\u0435 \u0434\u043e\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044c\u043d\u044b\u0435 \u043f\u043e\u043b\u044f \u0434\u043b\u044f \u044d\u043a\u0441\u043f\u0435\u0440\u0442\u043e\u0432',
  experience: '\u041e\u043f\u044b\u0442 \u0440\u0430\u0431\u043e\u0442\u044b (\u043b\u0435\u0442)',
  experienceError: '\u041e\u043f\u044b\u0442 \u0434\u043e\u043b\u0436\u0435\u043d \u0431\u044b\u0442\u044c \u043e\u0442 0 \u0434\u043e 90 \u043b\u0435\u0442',
  hourlyRate: '\u041f\u043e\u0447\u0430\u0441\u043e\u0432\u0430\u044f \u0441\u0442\u0430\u0432\u043a\u0430 (\u20BD)',
  hourlyRateError: '\u0421\u0442\u0430\u0432\u043a\u0430 \u0434\u043e\u043b\u0436\u043d\u0430 \u0431\u044b\u0442\u044c \u043e\u0442 0 \u0434\u043e 100000 \u20BD',
  education: '\u041e\u0431\u0440\u0430\u0437\u043e\u0432\u0430\u043d\u0438\u0435',
  educationPlaceholder:
    '\u0423\u043a\u0430\u0436\u0438\u0442\u0435 \u0432\u0430\u0448\u0435 \u043e\u0431\u0440\u0430\u0437\u043e\u0432\u0430\u043d\u0438\u0435 \u0438 \u043a\u0432\u0430\u043b\u0438\u0444\u0438\u043a\u0430\u0446\u0438\u0438',
  skills: '\u041d\u0430\u0432\u044b\u043a\u0438',
  skillsPlaceholder:
    '\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043d\u0430\u0432\u044b\u043a\u0438 \u0438\u043b\u0438 \u0434\u043e\u0431\u0430\u0432\u044c\u0442\u0435 \u0441\u0432\u043e\u0438',
  portfolio: '\u041f\u043e\u0440\u0442\u0444\u043e\u043b\u0438\u043e (\u0441\u0441\u044b\u043b\u043a\u0430)',
} as const;

interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
  profile: UserProfile | null;
  userProfile?: { role?: string; avatar?: string } | null;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ visible, onClose, profile, userProfile }) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const { updateUserInCache } = useUserUpdate();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const isExpert = userProfile?.role === 'expert';
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 575);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 575);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (visible) {
      document.body.style.overflow = 'hidden';
      const style = document.createElement('style');
      style.id = 'hide-scrollbar-style-profile';
      style.innerHTML = `
        ::-webkit-scrollbar { display: none; }
        * { -ms-overflow-style: none; scrollbar-width: none; }
      `;
      document.head.appendChild(style);
    } else {
      document.body.style.overflow = '';
      document.getElementById('hide-scrollbar-style-profile')?.remove();
    }

    return () => {
      document.body.style.overflow = '';
      document.getElementById('hide-scrollbar-style-profile')?.remove();
    };
  }, [visible]);

  useEffect(() => {
    if (visible && profile) {
      const toNumberOrUndefined = (value: unknown) => {
        if (value === null || value === undefined || value === '') return undefined;
        if (typeof value === 'number') return value;
        const num = Number(value);
        return Number.isFinite(num) ? num : undefined;
      };

      const formValues: Record<string, unknown> = { ...profile };
      formValues.display_username = profile.display_username || profile.username || '';
      formValues.experience_years = toNumberOrUndefined(profile.experience_years);
      formValues.hourly_rate = toNumberOrUndefined(profile.hourly_rate);

      if (profile.skills && typeof profile.skills === 'string') {
        formValues.skills = profile.skills.split(',').map((skill) => skill.trim()).filter(Boolean);
      }

      form.setFieldsValue(formValues);
    }

    if (visible) {
      setImageUrl(userProfile?.avatar ? userProfile.avatar : null);
    }
  }, [visible, profile, userProfile, form]);

  return (
    <Modal
      title={
        <div className={`${styles.profileModalTitle} ${isMobile ? styles.profileModalTitleMobile : styles.profileModalTitleDesktop}`}>
          {TEXT.title}
        </div>
      }
      open={visible}
      onCancel={onClose}
      onOk={() => form.submit()}
      width={isMobile ? 'calc(100vw - 16px)' : 750}
      style={isMobile ? { top: 8, paddingBottom: 8 } : { top: 20 }}
      okText={TEXT.save}
      cancelText={TEXT.cancel}
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
              username: typeof values.display_username === 'string' ? values.display_username.trim() : values.display_username,
              first_name: values.first_name,
              last_name: values.last_name,
              bio: values.bio,
            };

            if (isExpert) {
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
            message.success(TEXT.profileUpdated);
            onClose();
            updateUserInCache(result);
            void queryClient.invalidateQueries({ queryKey: ['userProfile'] });
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
              TEXT.profileUpdateError;
            message.error(detail);
          }
        }}
      >
        <Form.Item label={TEXT.avatar} name="avatar">
          <Upload
            name="avatar"
            listType="picture-card"
            showUploadList={false}
            beforeUpload={(file) => {
              const isImage = file.type.startsWith('image/');
              if (!isImage) {
                message.error(TEXT.imagesOnly);
                return false;
              }

              const isLt2M = file.size / 1024 / 1024 < 2;
              if (!isLt2M) {
                message.error(TEXT.maxFileSize);
                return false;
              }

              const reader = new FileReader();
              reader.onload = (event) => {
                setImageUrl(event.target?.result as string);
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

                if (!result) {
                  throw new Error(TEXT.uploadFailed);
                }

                form.setFieldsValue({ avatar: result.avatar });
                onSuccess?.(result);
                message.success(TEXT.uploadSuccess);
                updateUserInCache(result);
                void queryClient.invalidateQueries({ queryKey: ['userProfile'] });
              } catch (error) {
                onError?.(error as Error);
                message.error(TEXT.uploadFailed);
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
                <div className={styles.profileModalUploadLabel}>{TEXT.upload}</div>
              </div>
            )}
          </Upload>
        </Form.Item>

        <Form.Item
          label={TEXT.username}
          name="display_username"
          rules={[
            { required: true, message: TEXT.usernameRequired },
            { min: 3, message: TEXT.usernameMin },
            { max: 150, message: TEXT.usernameMax },
          ]}
          extra={TEXT.usernameExtra}
        >
          <Input className={styles.inputField} size="large" placeholder={TEXT.usernamePlaceholder} />
        </Form.Item>

        <Form.Item label={TEXT.bio} name="bio">
          <Input.TextArea
            autoSize={{ minRows: 4, maxRows: 10 }}
            placeholder={isExpert ? TEXT.bioExpert : TEXT.bioDefault}
            className={`${styles.textareaField} ${styles.profileModalTextarea}`}
          />
        </Form.Item>

        {isExpert && (
          <>
            <div className={styles.profileModalExpertInfo}>
              <h4 className={styles.profileModalExpertTitle}>{TEXT.expertInfoTitle}</h4>
              <p className={styles.profileModalExpertText}>{TEXT.expertInfoText}</p>
            </div>

            <div className={`${styles.profileModalExpertGrid} ${isMobile ? styles.profileModalExpertGridMobile : ''}`}>
              <Form.Item
                label={TEXT.experience}
                name="experience_years"
                className={styles.profileModalFlexField}
                rules={[{ type: 'number', min: 0, max: 90, message: TEXT.experienceError }]}
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
                  formatter={(value) => (value !== undefined && value !== null ? String(value) : '')}
                  controls={false}
                  className={`${styles.inputNumberField} ${styles.profileModalFullWidth}`}
                  size="large"
                  placeholder="0"
                  onKeyPress={(event) => {
                    if (!/[0-9]/.test(event.key)) {
                      event.preventDefault();
                    }
                  }}
                />
              </Form.Item>

              <Form.Item
                label={TEXT.hourlyRate}
                name="hourly_rate"
                className={styles.profileModalFlexField}
                rules={[{ type: 'number', min: 0, max: 100000, message: TEXT.hourlyRateError }]}
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
                  formatter={(value) => (value !== undefined && value !== null ? String(value) : '')}
                  controls={false}
                  className={`${styles.inputNumberField} ${styles.profileModalFullWidth}`}
                  size="large"
                  placeholder="0"
                  onKeyPress={(event) => {
                    if (!/[0-9]/.test(event.key)) {
                      event.preventDefault();
                    }
                  }}
                />
              </Form.Item>
            </div>

            <Form.Item label={TEXT.education} name="education">
              <Input.TextArea
                rows={3}
                placeholder={TEXT.educationPlaceholder}
                className={`${styles.textareaField} ${styles.profileModalTextarea}`}
              />
            </Form.Item>

            <Form.Item label={TEXT.skills} name="skills">
              <SkillsSelect placeholder={TEXT.skillsPlaceholder} valueType="name" mode="tags" />
            </Form.Item>

            <Form.Item label={TEXT.portfolio} name="portfolio_url">
              <Input placeholder="https://example.com/portfolio" className={styles.inputField} size="large" />
            </Form.Item>
          </>
        )}
      </Form>
    </Modal>
  );
};

export default ProfileModal;
