import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Upload, message, InputNumber as AntInputNumber } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/features/auth/api/auth';
import apiClient from '@/api/client';
import { UserProfile } from '../types';
import SkillsSelect from '../components/inputs/SkillsSelect';
import { useUserUpdate } from '@/hooks/useUserUpdate';
import styles from './ProfileModal.module.css';

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
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
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
      // Hide scrollbar visually but keep functionality if needed
      const style = document.createElement('style');
      style.id = 'hide-scrollbar-style-profile';
      style.innerHTML = `
        ::-webkit-scrollbar { display: none; }
        * { -ms-overflow-style: none; scrollbar-width: none; }
      `;
      document.head.appendChild(style);
    } else {
      document.body.style.overflow = '';
      const style = document.getElementById('hide-scrollbar-style-profile');
      if (style) {
        style.remove();
      }
    }
    return () => {
      document.body.style.overflow = '';
      const style = document.getElementById('hide-scrollbar-style-profile');
      if (style) {
        style.remove();
      }
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
          Р РµРґР°РєС‚РёСЂРѕРІР°С‚СЊ РїСЂРѕС„РёР»СЊ
        </div>
      }
      open={visible}
      onCancel={onClose}
      onOk={() => form.submit()}
      width={isMobile ? 'calc(100vw - 16px)' : 750}
      style={isMobile ? { top: 8, paddingBottom: 8 } : { top: 20 }}
      okText="РЎРѕС…СЂР°РЅРёС‚СЊ"
      cancelText="РћС‚РјРµРЅР°"
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
            message.success('РџСЂРѕС„РёР»СЊ РѕР±РЅРѕРІР»РµРЅ');
            onClose();
            // РћР±РЅРѕРІР»СЏРµРј РґР°РЅРЅС‹Рµ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ РІРѕ РІСЃС‘Рј РїСЂРёР»РѕР¶РµРЅРёРё
            updateUserInCache(result);
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
              'РќРµ СѓРґР°Р»РѕСЃСЊ РѕР±РЅРѕРІРёС‚СЊ РїСЂРѕС„РёР»СЊ';
            message.error(detail);
          }
        }}
      >
        <Form.Item label="РђРІР°С‚Р°СЂ" name="avatar">
          <Upload
            name="avatar"
            listType="picture-card"
            showUploadList={false}
            beforeUpload={(file) => {
              const isImage = file.type.startsWith('image/');
              if (!isImage) {
                message.error('РњРѕР¶РЅРѕ Р·Р°РіСЂСѓР¶Р°С‚СЊ С‚РѕР»СЊРєРѕ РёР·РѕР±СЂР°Р¶РµРЅРёСЏ!');
                return false;
              }
              const isLt2M = file.size / 1024 / 1024 < 2;
              if (!isLt2M) {
                message.error('Р Р°Р·РјРµСЂ С„Р°Р№Р»Р° РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ РјРµРЅСЊС€Рµ 2MB!');
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
                  message.success('РђРІР°С‚Р°СЂ РѕР±РЅРѕРІР»РµРЅ!');

                                    // РћР±РЅРѕРІР»СЏРµРј РґР°РЅРЅС‹Рµ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ РІРѕ РІСЃС‘Рј РїСЂРёР»РѕР¶РµРЅРёРё
                  updateUserInCache(result);
                } else {
                  throw new Error('РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё');
                }
              } catch (error) {
                onError?.(error as Error);
                message.error('РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ Р°РІР°С‚Р°СЂ');
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
                <div className={styles.profileModalUploadLabel}>Р—Р°РіСЂСѓР·РёС‚СЊ</div>
              </div>
            )}
          </Upload>
        </Form.Item>
                <Form.Item 
          label="РќРёРєРЅРµР№Рј" 
          name="username"
          rules={[
            { required: true, message: 'Р’РІРµРґРёС‚Рµ РЅРёРєРЅРµР№Рј' },
            { min: 3, message: 'РњРёРЅРёРјСѓРј 3 СЃРёРјРІРѕР»Р°' },
            { max: 150, message: 'РњР°РєСЃРёРјСѓРј 150 СЃРёРјРІРѕР»РѕРІ' }
          ]}
          extra="РњРѕР¶РЅРѕ РёСЃРїРѕР»СЊР·РѕРІР°С‚СЊ РїСЂРѕР±РµР»С‹ Рё СЃРїРµС†РёР°Р»СЊРЅС‹Рµ СЃРёРјРІРѕР»С‹"
        >
          <Input 
            className={styles.inputField} 
            size="large" 
            placeholder="Р’Р°С€ РЅРёРєРЅРµР№Рј"
          />
        </Form.Item>
        <Form.Item label="Рћ СЃРµР±Рµ" name="bio">
          <Input.TextArea 
            autoSize={{ minRows: 4, maxRows: 10 }}
            placeholder={isExpert ? "Р Р°СЃСЃРєР°Р¶РёС‚Рµ Рѕ СЃРµР±Рµ, СЃРІРѕРµРј РѕРїС‹С‚Рµ Рё СЃРїРµС†РёР°Р»РёР·Р°С†РёРё" : "Р Р°СЃСЃРєР°Р¶РёС‚Рµ РЅРµРјРЅРѕРіРѕ Рѕ СЃРµР±Рµ"} 
            className={`${styles.textareaField} ${styles.profileModalTextarea}`} 
          />
        </Form.Item>
        
        
        {isExpert && (
          <>
            <div className={styles.profileModalExpertInfo}>
              <h4 className={styles.profileModalExpertTitle}>РџСЂРѕС„РµСЃСЃРёРѕРЅР°Р»СЊРЅР°СЏ РёРЅС„РѕСЂРјР°С†РёСЏ</h4>
              <p className={styles.profileModalExpertText}>
                Р—Р°РїРѕР»РЅРёС‚Рµ РґРѕРїРѕР»РЅРёС‚РµР»СЊРЅС‹Рµ РїРѕР»СЏ РґР»СЏ СЌРєСЃРїРµСЂС‚РѕРІ
              </p>
            </div>
            <div className={`${styles.profileModalExpertGrid} ${isMobile ? styles.profileModalExpertGridMobile : ''}`}>
              <Form.Item 
                label="РћРїС‹С‚ СЂР°Р±РѕС‚С‹ (Р»РµС‚)" 
                name="experience_years" 
                className={styles.profileModalFlexField}
                rules={[
                  { type: 'number', min: 0, max: 90, message: 'РћРїС‹С‚ РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ РѕС‚ 0 РґРѕ 90 Р»РµС‚' }
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
                label="РџРѕС‡Р°СЃРѕРІР°СЏ СЃС‚Р°РІРєР° (в‚Ѕ)" 
                name="hourly_rate" 
                className={styles.profileModalFlexField}
                rules={[
                  { type: 'number', min: 0, max: 100000, message: 'РЎС‚Р°РІРєР° РґРѕР»Р¶РЅР° Р±С‹С‚СЊ РѕС‚ 0 РґРѕ 100000 в‚Ѕ' }
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
            <Form.Item label="РћР±СЂР°Р·РѕРІР°РЅРёРµ" name="education">
              <Input.TextArea
                rows={3}
                placeholder="РЈРєР°Р¶РёС‚Рµ РІР°С€Рµ РѕР±СЂР°Р·РѕРІР°РЅРёРµ Рё РєРІР°Р»РёС„РёРєР°С†РёРё"
                className={`${styles.textareaField} ${styles.profileModalTextarea}`}
              />
            </Form.Item>
            <Form.Item label="РќР°РІС‹РєРё" name="skills">
              <SkillsSelect 
                placeholder="Р’С‹Р±РµСЂРёС‚Рµ РЅР°РІС‹РєРё РёР»Рё РґРѕР±Р°РІСЊС‚Рµ СЃРІРѕРё" 
                valueType="name"
                mode="tags"
              />
            </Form.Item>
            <Form.Item label="РџРѕСЂС‚С„РѕР»РёРѕ (СЃСЃС‹Р»РєР°)" name="portfolio_url">
              <Input placeholder="https://example.com/portfolio" className={styles.inputField} size="large" />
            </Form.Item>
          </>
        )}
      </Form>
    </Modal>
  );
};

export default ProfileModal;

