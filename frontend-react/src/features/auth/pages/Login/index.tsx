import React, { useState, useEffect } from 'react';
import { Tabs, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { authApi, type LoginRequest, type RegisterRequest } from '@/features/auth/api/auth';
import EmailVerificationModal from '../../components/EmailVerificationModal';
import PasswordResetModal from '../../components/PasswordResetModal';
import { useAuthNavigation } from './hooks/useAuthNavigation';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import ChatBubbles from './ChatBubbles';
import { logger } from '@/utils/logger';
import styles from '@/features/auth/Login.module.css';

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('register');
  const { navigate, isAdminLogin, isDirectorLogin, navigateByRole } = useAuthNavigation();
  const location = window.location;

  const debugEnabled =
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    window.localStorage?.getItem('debug_api') === '1';

  const [verificationModalVisible, setVerificationModalVisible] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState<string | undefined>(undefined);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationLoading, setVerificationLoading] = useState(false);

  const [passwordResetModalVisible, setPasswordResetModalVisible] = useState(false);
  const [resetStep, setResetStep] = useState<'email' | 'code' | 'password'>('email');
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const [referralCode, setReferralCode] = useState<string>('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const refCode = params.get('ref');
    if (refCode) {
      setReferralCode(refCode);
      setActiveTab('register');
    }
    const token = localStorage.getItem('access_token');
    if (token) {
      fetch('/api/users/me/', {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      })
        .then(response => {
          if (response.ok) {
            navigate('/dashboard');
          } else {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user_role');
          }
        })
        .catch(() => {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user_role');
        });
    }
  }, [location.search, navigate]);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) navigate('/dashboard');
  }, [navigate]);

  const onLogin = async (values: LoginRequest) => {
    setLoading(true);
    try {
      const auth = await authApi.login(values);
      message.success('Успешный вход!');
      setVerificationModalVisible(false);
      const role = auth?.user?.role;
      if (isAdminLogin && role !== 'admin') {
        message.error('У вас нет доступа к панели администратора');
      }
      if (isDirectorLogin && role !== 'director') {
        message.error('У вас нет доступа к панели директора');
      }
      navigateByRole(role);
    } catch (error: any) {
      const errorData = error.response?.data;
      const errorMessage = errorData?.detail || errorData?.non_field_errors?.[0] || 'Ошибка входа';
      message.error(errorMessage);
      if (errorMessage.includes('учетные данные') || errorMessage.includes('credentials')) {
        setTimeout(() => { message.info('Забыли пароль? Используйте функцию "Забыли пароль?" ниже'); }, 1000);
      }
    } finally {
      setLoading(false);
    }
  };

  const onRegister = async (values: RegisterRequest) => {
    setLoading(true);
    try {
      const cleanValues = {
        email: values.email || undefined,
        phone: values.phone || undefined,
        password: values.password,
        password2: values.password2,
        role: values.role || 'client',
        referral_code: values.referral_code || referralCode || undefined,
      } as RegisterRequest;
      if (debugEnabled) logger.log('[Registration] Sending data:', cleanValues);
      await authApi.register(cleanValues);
      if (values.email) {
        message.success('Регистрация успешна! Мы отправили вам код на email.');
        setVerificationEmail(values.email);
        setVerificationCode('');
        setVerificationModalVisible(true);
      } else {
        message.success('Регистрация успешна!');
        await onLogin({ username: values.phone || values.email, password: values.password } as LoginRequest);
      }
    } catch (error: any) {
      if (debugEnabled) logger.error('Registration error:', error);
      const errorData = error?.response?.data;
      if (errorData && typeof errorData === 'object') {
        const entries = Object.entries(errorData as Record<string, any>);
        if (entries.length === 0) {
          message.error('Ошибка регистрации');
        } else {
          entries.forEach(([field, v]) => {
            if (Array.isArray(v)) {
              v.forEach((msg) => {
                const errorMsg = String(msg);
                message.error(errorMsg);
                if (field === 'email' && errorMsg.includes('уже существует')) {
                  setTimeout(() => { message.info('Попробуйте войти с этим email на вкладке "Вход"'); }, 1000);
                }
              });
            } else if (typeof v === 'string') {
              message.error(v);
            } else if (v && typeof v === 'object' && 'detail' in v) {
              message.error(String(v.detail));
            }
          });
        }
      } else {
        message.error(error?.message || 'Ошибка регистрации');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmailCode = async () => {
    if (!verificationEmail) { message.error('Не указан email для подтверждения'); return; }
    if (!verificationCode || verificationCode.trim().length < 4) { message.error('Введите корректный код подтверждения'); return; }
    setVerificationLoading(true);
    try {
      const auth = await authApi.verifyEmailCode(verificationEmail, verificationCode.trim());
      message.success('Email подтвержден! Вход выполнен.');
      setVerificationModalVisible(false);
      navigateByRole(auth?.user?.role);
    } catch (error: any) {
      message.error(error?.response?.data?.detail || 'Не удалось подтвердить email');
    } finally {
      setVerificationLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!verificationEmail) return;
    try {
      await authApi.resendVerificationCode(verificationEmail);
      message.success('Код отправлен повторно');
    } catch (error: any) {
      message.error(error?.response?.data?.detail || 'Не удалось отправить код');
    }
  };

  const handleRequestPasswordReset = async () => {
    if (!resetEmail) { message.error('Введите email'); return; }
    setResetLoading(true);
    try {
      await authApi.requestPasswordReset(resetEmail);
      message.success('Код отправлен на ваш email');
      setResetStep('code');
    } catch (error: any) {
      message.error(error?.response?.data?.error || 'Ошибка отправки кода');
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetCodeChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;
    const newCode = [...resetCode];
    newCode[index] = value;
    setResetCode(newCode);
    if (value && index < 5) {
      const nextInput = document.getElementById(`reset-code-${index + 1}`);
      if (nextInput) (nextInput as HTMLInputElement).focus();
    }
  };

  const handleVerifyResetCode = async () => {
    const codeString = resetCode.join('');
    if (codeString.length !== 6) { message.error('Введите 6-значный код'); return; }
    setResetStep('password');
  };

  const handleResetPassword = async () => {
    if (newPassword !== confirmPassword) { message.error('Пароли не совпадают'); return; }
    if (newPassword.length < 8) { message.error('Пароль должен содержать минимум 8 символов'); return; }
    const codeString = resetCode.join('');
    if (codeString.length !== 6) { message.error('Введите 6-значный код'); return; }
    setResetLoading(true);
    try {
      await authApi.resetPasswordWithCode(resetEmail, codeString, newPassword);
      message.success('Пароль успешно изменен!');
      setPasswordResetModalVisible(false);
      setResetStep('email');
      setResetEmail('');
      setResetCode(['', '', '', '', '', '']);
      setNewPassword('');
      setConfirmPassword('');
      navigateByRole();
    } catch (error: any) {
      message.error(error?.response?.data?.error || 'Ошибка сброса пароля');
      setResetCode(['', '', '', '', '', '']);
      setResetStep('code');
    } finally {
      setResetLoading(false);
    }
  };

  const handleTelegramAuth = async (user: any) => {
    message.success('Успешный вход через Telegram!');
    navigateByRole(user?.role);
  };

  const handleTelegramError = (error: string) => {
    message.error(`Ошибка авторизации через Telegram: ${error}`);
  };

  return (
    <div className={styles.loginPage}>
      <div className={styles.authCard}>
        <div className={styles.authLeft}>
          <div className={styles.hero}>
            {activeTab === 'register' && <ChatBubbles />}
            <img className={styles.heroImage} src="/assets/first-screen/first-screen-students.png" alt="hero" />
          </div>
          <svg
            className={styles.bottomWave}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 1440 140"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M0,64 C240,120 480,8 720,64 C960,120 1200,8 1440,64 L1440,140 L0,140 Z"
              fill="#ffffff"
            />
          </svg>
        </div>
        <div className={styles.authRight}>
          <div className={styles.authPanel}>
            <div className={styles.panelBody}>
              <Tabs
                className={styles.antdTabsClean}
                activeKey={activeTab}
                onChange={(key) => setActiveTab(key)}
                items={[
                  {
                    key: 'register',
                    label: 'Зарегистрироваться',
                    children: (
                      <RegisterForm
                        loading={loading}
                        referralCode={referralCode}
                        onRegister={onRegister}
                        onTelegramAuth={handleTelegramAuth}
                        onTelegramError={handleTelegramError}
                      />
                    ),
                  },
                  {
                    key: 'login',
                    label: 'Войти',
                    children: (
                      <LoginForm
                        loading={loading}
                        onLogin={onLogin}
                        onForgotPassword={() => setPasswordResetModalVisible(true)}
                        onTelegramAuth={handleTelegramAuth}
                        onTelegramError={handleTelegramError}
                      />
                    ),
                  },
                ]}
              />
              <EmailVerificationModal
                open={verificationModalVisible}
                email={verificationEmail}
                code={verificationCode}
                loading={verificationLoading}
                onChangeCode={setVerificationCode}
                onVerify={handleVerifyEmailCode}
                onResend={handleResendCode}
                onCancel={() => setVerificationModalVisible(false)}
              />
              <PasswordResetModal
                open={passwordResetModalVisible}
                step={resetStep}
                email={resetEmail}
                code={resetCode}
                newPassword={newPassword}
                confirmPassword={confirmPassword}
                loading={resetLoading}
                onEmailChange={setResetEmail}
                onCodeChange={handleResetCodeChange}
                onNewPasswordChange={setNewPassword}
                onConfirmPasswordChange={setConfirmPassword}
                onRequestCode={handleRequestPasswordReset}
                onVerifyCode={handleVerifyResetCode}
                onResetPassword={handleResetPassword}
                onBackToEmail={() => setResetStep('email')}
                onBackToCode={() => setResetStep('code')}
                onGoToCodeStep={() => setResetStep('code')}
                onCancel={() => {
                  setPasswordResetModalVisible(false);
                  setResetStep('email');
                  setResetEmail('');
                  setResetCode(['', '', '', '', '', '']);
                  setNewPassword('');
                  setConfirmPassword('');
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
