import React, { useState, useEffect } from 'react';
import { Form, Input, Button, message, Tabs } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authApi, type LoginRequest, type RegisterRequest } from '../api/auth';
import EmailVerificationModal from '../components/auth/EmailVerificationModal';
import PasswordResetModal from '../components/auth/PasswordResetModal';
import SocialLoginButtons from '../components/auth/SocialLoginButtons';
import { ordersApi } from '../api/orders';
import '../styles/login.css';

// Typography helpers не используются в текущей верстке

// Хук анимации печатания для плейсхолдера
function useTypewriter(fullText: string, speed = 35, startDelay = 0) {
  const [text, setText] = useState('');
  React.useEffect(() => {
    let i = 0;
    let intervalId: any = null;
    const startTimer = setTimeout(() => {
      intervalId = setInterval(() => {
        i += 1;
        setText(fullText.slice(0, i));
        if (i >= fullText.length) {
          clearInterval(intervalId);
        }
      }, speed);
    }, startDelay);
    return () => {
      clearTimeout(startTimer);
      if (intervalId) clearInterval(intervalId);
    };
  }, [fullText, speed, startDelay]);
  return text;
}

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [registerForm] = Form.useForm();
  const [loginForm] = Form.useForm();
  const [selectedRole, setSelectedRole] = useState<'client' | 'expert'>('client');
  const [activeTab, setActiveTab] = useState<string>('register');
  const navigate = useNavigate();

  // Модалка подтверждения email
  const [verificationModalVisible, setVerificationModalVisible] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState<string | undefined>(undefined);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationLoading, setVerificationLoading] = useState(false);

  // Модалка восстановления пароля
  const [passwordResetModalVisible, setPasswordResetModalVisible] = useState(false);
  const [resetStep, setResetStep] = useState<'email' | 'code' | 'password'>('email');
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // Плейсхолдеры с анимацией
  const loginUsernamePh = useTypewriter('Email', 35, 100);
  const loginPasswordPh = useTypewriter('Пароль', 35, 250);
  const regEmailPh = useTypewriter('Email', 35, 120);
  const regPasswordPh = useTypewriter('Пароль', 35, 420);
  const regPassword2Ph = useTypewriter('Подтвердите пароль', 35, 560);
  const regReferralPh = useTypewriter('Реферальный код', 35, 700);
  
  // Тексты для анимации диалога на левой панели
  const bubbleQuestionText = 'Можете сделать курсовую за час?';
  const bubbleAnswerText = 'Без проблем!';
  // Параметры печати для синхронизации анимаций
  const leftDelay = 600;
  const leftSpeed = 65;
  const leftLen = bubbleQuestionText.length;
  // Анимация отправки троеточием: появляется после завершения печати слева
  const sendDuration = 1200;
  const sendDelay = leftDelay + leftSpeed * leftLen + 150;
  // Ответ справа стартует после завершения анимации отправки
  const rightDelay = sendDelay + sendDuration + 100;
  const answerLen = bubbleAnswerText.length;
  const answerSpeed = 65;
  // Пауза с троеточием внутри правого пузыря перед печатью
  const answerDotsDuration = 1200;
  const answerStartDelay = rightDelay + answerDotsDuration;
  const thumbDotsDelay = answerStartDelay + answerSpeed * answerLen + 150; // троеточие в третьем блоке после ответа
  const thumbDotsDuration = 1200; // длительность показа троеточия

  const [thumbStage, setThumbStage] = useState<'idle' | 'dots' | 'emoji'>('idle');
  useEffect(() => {
    const dotsTimer = setTimeout(() => setThumbStage('dots'), thumbDotsDelay);
    const emojiTimer = setTimeout(() => setThumbStage('emoji'), thumbDotsDelay + thumbDotsDuration);
    return () => {
      clearTimeout(dotsTimer);
      clearTimeout(emojiTimer);
    };
  }, [thumbDotsDelay, thumbDotsDuration]);

  const bubbleQuestion = useTypewriter(bubbleQuestionText, leftSpeed, leftDelay);
  const isQuestionLoading = bubbleQuestion.length === 0;
  const bubbleAnswer = useTypewriter(bubbleAnswerText, answerSpeed, answerStartDelay);
  const isAnswerLoading = bubbleAnswer.length === 0;
  
  // Автоматически подставляем реферальный код при загрузке
  React.useEffect(() => {
    const savedReferralCode = localStorage.getItem('referral_code');
    if (savedReferralCode) {
      registerForm.setFieldsValue({ referral_code: savedReferralCode });
    }
  }, [registerForm]);

  // Функция для проверки наличия заказов у клиента
  const checkClientOrders = async (): Promise<boolean> => {
    try {
      const ordersData = await ordersApi.getClientOrders();
      const orders = ordersData?.results || ordersData || [];
      return orders.length > 0;
    } catch (error) {
      console.error('Ошибка при проверке заказов:', error);
      return false;
    }
  };

  // Функция для определения куда перенаправить клиента
  const redirectClient = async () => {
    // Клиенты теперь идут на ExpertDashboard
    navigate('/expert');
  };

  const onLogin = async (values: LoginRequest) => {
    setLoading(true);
    try {
      const auth = await authApi.login(values);
      message.success('Успешный вход!');
      
      // Закрываем модалку подтверждения если она была открыта
      setVerificationModalVisible(false);
      
      const role = auth?.user?.role;
      if (role === 'client' || role === 'expert') {
        navigate('/expert');
      } else if (role === 'partner') {
        navigate('/partner');
      } else if (role === 'admin') {
        navigate('/admin');
      } else if (role === 'arbitrator') {
        navigate('/arbitrator');
      } else {
        navigate('/expert');
      }
    } catch (error: any) {
      const errorData = error.response?.data;
      const errorMessage = errorData?.detail || errorData?.non_field_errors?.[0] || 'Ошибка входа';
      
      message.error(errorMessage);
      
      // Если ошибка связана с неверными учетными данными, предлагаем сброс пароля
      if (errorMessage.includes('учетные данные') || errorMessage.includes('credentials')) {
        setTimeout(() => {
          message.info('Забыли пароль? Используйте функцию "Забыли пароль?" ниже');
        }, 1000);
      }
    } finally {
      setLoading(false);
    }
  };

  const onRegister = async (values: RegisterRequest) => {
    setLoading(true);
    try {
      // Очищаем пустые поля перед отправкой
      const cleanValues = {
        email: values.email || undefined,
        phone: values.phone || undefined,
        password: values.password,
        password2: values.password2,
        role: values.role || 'client',
      } as RegisterRequest;
      
      await authApi.register(cleanValues);
      
      // Показываем модалку подтверждения только если указан email
      if (values.email) {
        message.success('Регистрация успешна! Мы отправили вам код на email.');
        setVerificationEmail(values.email);
        setVerificationCode('');
        setVerificationModalVisible(true);
      } else {
        // Если email не указан, просто входим
        message.success('Регистрация успешна!');
        const loginData = {
          username: values.phone || values.email,
          password: values.password,
        } as LoginRequest;
        await onLogin(loginData);
      }
    } catch (error: any) {
      console.error('Registration error:', error);
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
                
                // Если email уже существует и подтвержден, предлагаем войти
                if (field === 'email' && errorMsg.includes('уже существует')) {
                  setTimeout(() => {
                    message.info('Попробуйте войти с этим email на вкладке "Вход"');
                  }, 1000);
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
    if (!verificationEmail) {
      message.error('Не указан email для подтверждения');
      return;
    }
    if (!verificationCode || verificationCode.trim().length < 4) {
      message.error('Введите корректный код подтверждения');
      return;
    }
    setVerificationLoading(true);
    try {
      // verifyEmailCode уже возвращает токены и сохраняет их
      const auth = await authApi.verifyEmailCode(verificationEmail, verificationCode.trim());
      message.success('Email подтвержден! Вход выполнен.');
      
      // Токены уже сохранены в authApi.verifyEmailCode
      const role = auth?.user?.role;
      setVerificationModalVisible(false);
      
      // Перенаправляем в зависимости от роли
      if (role === 'client' || role === 'expert') {
        navigate('/expert');
      } else if (role === 'partner') {
        navigate('/partner');
      } else {
        navigate('/expert');
      }
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

  // Функции восстановления пароля
  const handleRequestPasswordReset = async () => {
    if (!resetEmail) {
      message.error('Введите email');
      return;
    }
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
    if (codeString.length !== 6) {
      message.error('Введите 6-значный код');
      return;
    }
    // Просто переходим к следующему шагу
    // Проверка кода произойдет при сбросе пароля
    setResetStep('password');
  };

  const handleResetPassword = async () => {
    if (newPassword !== confirmPassword) {
      message.error('Пароли не совпадают');
      return;
    }
    if (newPassword.length < 8) {
      message.error('Пароль должен содержать минимум 8 символов');
      return;
    }
    const codeString = resetCode.join('');
    if (codeString.length !== 6) {
      message.error('Введите 6-значный код');
      return;
    }
    setResetLoading(true);
    try {
      const response = await authApi.resetPasswordWithCode(resetEmail, codeString, newPassword);
      message.success('Пароль успешно изменен!');
      setPasswordResetModalVisible(false);
      // Сбрасываем состояние
      setResetStep('email');
      setResetEmail('');
      setResetCode(['', '', '', '', '', '']);
      setNewPassword('');
      setConfirmPassword('');
      // Перенаправляем
      navigate('/expert');
    } catch (error: any) {
      message.error(error?.response?.data?.error || 'Ошибка сброса пароля');
      setResetCode(['', '', '', '', '', '']);
      // Возвращаем на шаг ввода кода при ошибке
      setResetStep('code');
    } finally {
      setResetLoading(false);
    }
  };

  // Обработчик успешной авторизации через Telegram
  const handleTelegramAuth = async (user: any) => {
    message.success('Успешный вход через Telegram!');
    const role = user?.role;
    if (role === 'client' || role === 'expert') {
      navigate('/expert');
    } else if (role === 'partner') {
      navigate('/partner');
    } else if (role === 'admin') {
      navigate('/admin');
    } else if (role === 'arbitrator') {
      navigate('/arbitrator');
    } else {
      navigate('/expert');
    }
  };

  // Обработчик ошибки авторизации через Telegram
  const handleTelegramError = (error: string) => {
    message.error(`Ошибка авторизации через Telegram: ${error}`);
  };

  const loginFormComponent = (
    <Form form={loginForm} onFinish={onLogin} layout="vertical">
      <Form.Item
        label="Email"
        name="username"
        rules={[{ required: true, message: 'Введите email' }]}
      >
        <Input prefix={<UserOutlined />} placeholder={loginUsernamePh || ' '} />
      </Form.Item>
      <Form.Item
        label="Пароль"
        name="password"
        rules={[{ required: true, message: 'Введите пароль' }]}
        extra={
          <Button
            type="link"
            htmlType="button"
            className="forgot-password-link"
            onClick={() => setPasswordResetModalVisible(true)}
          >
            Забыли пароль?
          </Button>
        }
      >
        <Input.Password prefix={<LockOutlined />} placeholder={loginPasswordPh || ' '} />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block>
          Войти
        </Button>
      </Form.Item>
      <Form.Item>
        <SocialLoginButtons
          onTelegramAuth={handleTelegramAuth}
          onTelegramError={handleTelegramError}
        />
      </Form.Item>
      
    </Form>
  );

  const registerFormComponent = (
    <Form form={registerForm} onFinish={onRegister} layout="vertical">
      <Form.Item 
        label="Email"
        name="email" 
        rules={[
          { type: 'email', message: 'Некорректный email' },
          ({ getFieldValue }) => ({
            validator(_, value) {
              const phone = getFieldValue('phone');
              if (!value && !phone) {
                return Promise.reject(new Error('Укажите email'));
              }
              return Promise.resolve();
            },
          }),
        ]}
      > 
        <Input prefix={<MailOutlined />} placeholder={regEmailPh || ' '} />
      </Form.Item>
     
      <Form.Item
        label="Пароль"
        name="password"
        rules={[{ required: true, message: 'Введите пароль' }]}
      >
        <Input.Password prefix={<LockOutlined />} placeholder={regPasswordPh || ' '} />
      </Form.Item>
      <Form.Item
        label="Подтвердите пароль"
        name="password2"
        rules={[
          { required: true, message: 'Подтвердите пароль' },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue('password') === value) {
                return Promise.resolve();
              }
              return Promise.reject(new Error('Пароли не совпадают'));
            },
          }),
        ]}
      >
        <Input.Password prefix={<LockOutlined />} placeholder={regPassword2Ph || ' '} />
      </Form.Item>
      <Form.Item name="role" initialValue="client" rules={[{ required: true, message: 'Выберите роль' }]} hidden>
        <Input type="hidden" />
      </Form.Item>

      <Form.Item label="Роль">
        <div className="role-switch" role="group" aria-label="Выбор роли">
          <div className={`role-indicator ${selectedRole === 'expert' ? 'expert' : 'client'}`} />
          <button
            type="button"
            className={`role-option ${selectedRole === 'client' ? 'active' : ''}`}
            onClick={() => { setSelectedRole('client'); registerForm.setFieldsValue({ role: 'client' }); }}
          >
            Клиент
          </button>
          <button
            type="button"
            className={`role-option ${selectedRole === 'expert' ? 'active' : ''}`}
            onClick={() => { setSelectedRole('expert'); registerForm.setFieldsValue({ role: 'expert' }); }}
          >
            Исполнитель
          </button>
        </div>
      </Form.Item>
      <Form.Item
        name="referral_code"
        label="Реферальный код (необязательно)"
      >
        <Input placeholder={regReferralPh || ' '} />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block>
          Зарегистрироваться
        </Button>
      </Form.Item>
      <Form.Item>
        <SocialLoginButtons
          onTelegramAuth={handleTelegramAuth}
          onTelegramError={handleTelegramError}
        />
      </Form.Item>
    </Form>
  );

  return (
    <div className="login-page">
      <div className="auth-card">
        <div className="auth-left">
          <div className="hero">
            {activeTab === 'register' && (
            <div className="chat-bubbles">
              <div className="bubble bubble-left">
                <span className="bubble-text">{bubbleQuestion}</span>
                {isQuestionLoading && (
                  <span className="typing" aria-live="polite">
                    <span className="dot"></span>
                    <span className="dot"></span>
                    <span className="dot"></span>
                  </span>
                )}
              </div>
              {/* Троеточие отправки: появляется между левым и правым блоками */}
              <div className="send-ellipsis" style={{ animationDelay: `${sendDelay}ms` }} aria-hidden="true">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </div>
              <div className="bubble bubble-right" style={{ animationDelay: `${rightDelay}ms` }}>
                <span className="bubble-text">{bubbleAnswer}</span>
                {isAnswerLoading && (
                  <span className="typing" aria-live="polite">
                    <span className="dot"></span>
                    <span className="dot"></span>
                    <span className="dot"></span>
                  </span>
                )}
              </div>
              <div className="bubble bubble-left bubble-left-2" style={{ animationDelay: `${thumbDotsDelay}ms` }}>
                {thumbStage !== 'emoji' && (
                  <span className="typing" aria-live="polite">
                    <span className="dot"></span>
                    <span className="dot"></span>
                    <span className="dot"></span>
                  </span>
                )}
                {thumbStage === 'emoji' && (
                  <img
                    className="bubble-thumb-img"
                    src="https://smileysplanet.ru/smileys/apple/thumbs-up-1328.png"
                    alt="thumb up"
                    width={22}
                    height={22}
                    loading="eager"
                  />
                )}
              </div>
            </div>
            )}
            <img className="hero-image" src="/assets/first-screen/first-screen-students.png" alt="hero" />
          </div>
          <svg
            className="bottom-wave"
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
      <div className="auth-right">
        <div className="auth-panel">
          <div className="panel-body">
            <Tabs
              className="antd-tabs-clean"
              activeKey={activeTab}
              onChange={(key) => setActiveTab(key)}
              items={[
                { key: 'register', label: 'Зарегистрироваться', children: registerFormComponent },
                { key: 'login', label: 'Войти', children: loginFormComponent },
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
