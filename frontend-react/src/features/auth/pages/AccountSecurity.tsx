import React, { useEffect, useState } from 'react';
import { Alert, Button, Form, Input, Skeleton, Tabs, Typography } from 'antd';
import { ArrowLeftOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import apiClient from '@/api/client';
import { authApi } from '@/features/auth/api/auth';
import { CURRENT_USER_KEY } from '@/hooks/queries';
import styles from './AccountSecurity.module.css';

interface PasswordValues { current_password?: string; code?: string; new_password: string; confirm_password: string }
export default function AccountSecurity() {
  const navigate = useNavigate();
  const [form] = Form.useForm<PasswordValues>();
  const [mode, setMode] = useState('change');
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const user = useQuery({ queryKey: [...CURRENT_USER_KEY], queryFn: authApi.getCurrentUser });
  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);
  const showError = (err: unknown) => {
    if (isAxiosError(err)) {
      setError(err.response?.status === 429 ? 'Слишком много попыток. Попробуйте позже.' :
        String(err.response?.data?.error || err.response?.data?.detail || 'Не удалось выполнить запрос. Попробуйте ещё раз.'));
    } else setError('Не удалось выполнить запрос. Проверьте соединение.');
  };
  const sendCode = async () => {
    setSending(true); setError(''); setSuccess('');
    try {
      await apiClient.post('/users/password/recovery/', {});
      setSent(true); setCooldown(60);
    } catch (err) { showError(err); } finally { setSending(false); }
  };
  const submit = async (values: PasswordValues) => {
    setBusy(true); setError(''); setSuccess('');
    try {
      await apiClient.post(mode === 'change' ? '/users/password/change/' : '/users/password/recovery/confirm/', {
        current_password: values.current_password, new_password: values.new_password, code: values.code,
      });
      form.resetFields(); setSent(false);
      setSuccess('Пароль изменён. При следующем входе используйте новый пароль.');
    } catch (err) { showError(err); } finally { setBusy(false); }
  };
  return <section className={styles.page} aria-labelledby="security-title">
    <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => navigate('/dashboard')} className={styles.back}>В кабинет</Button>
    <Typography.Title id="security-title" level={2}>Пароль и безопасность</Typography.Title>
    <Typography.Paragraph type="secondary">Измените пароль или восстановите доступ с помощью почты своего аккаунта.</Typography.Paragraph>
    {user.isPending ? <Skeleton active paragraph={{ rows: 5 }} /> : user.isError ?
      <Alert type="error" showIcon message="Не удалось загрузить аккаунт" action={<Button onClick={() => user.refetch()}>Повторить</Button>} /> : <>
      <Tabs activeKey={mode} onChange={key => { setMode(key); form.resetFields(); setError(''); setSuccess(''); }}
        items={[{ key: 'change', label: 'Изменить пароль', icon: <LockOutlined />, disabled: busy || sending },
          { key: 'recovery', label: 'Восстановить по почте', icon: <MailOutlined />, disabled: busy || sending }]} />
      <div aria-live="polite" className={styles.feedback}>
        {error && <Alert type="error" showIcon message={error} />}
        {success && <Alert type="success" showIcon message={success} />}
      </div>
      {mode === 'recovery' && <div className={styles.recovery}>
        {user.data?.email ? <>
          <Typography.Paragraph>Письмо придёт на <strong>{user.data.email}</strong>.</Typography.Paragraph>
          <Button onClick={sendCode} loading={sending} disabled={busy || cooldown > 0}>
            {cooldown > 0 ? `Повторить через ${cooldown} с` : sent ? 'Отправить код повторно' : 'Отправить код на почту'}
          </Button>
          {sent && <Typography.Paragraph className={styles.hint} role="status">Код отправлен. Проверьте входящие и спам. Он действует 15 минут.</Typography.Paragraph>}
        </> : <Alert type="warning" showIcon message="В аккаунте нет почты для восстановления. Обратитесь в поддержку. Если помните текущий пароль, используйте вкладку «Изменить пароль»." />}
      </div>}
      {(mode === 'change' || (sent && user.data?.email)) && <Form form={form} layout="vertical" onFinish={submit} disabled={busy || sending} requiredMark={false}>
        {mode === 'change' ? <Form.Item name="current_password" label="Текущий пароль" rules={[{ required: true, message: 'Введите текущий пароль' }]}>
          <Input.Password autoComplete="current-password" size="large" />
        </Form.Item> : <Form.Item name="code" label="Код из письма" rules={[{ required: true, message: 'Введите код' }, { pattern: /^\d{6}$/, message: 'Код состоит из 6 цифр' }]}>
          <Input autoComplete="one-time-code" inputMode="numeric" maxLength={6} size="large" />
        </Form.Item>}
        <Form.Item name="new_password" label="Новый пароль" extra="От 8 до 128 символов. Не используйте простой пароль или личные данные."
          rules={[{ required: true, message: 'Введите новый пароль' }, { min: 8, max: 128, message: 'От 8 до 128 символов' }]}>
          <Input.Password autoComplete="new-password" maxLength={128} size="large" />
        </Form.Item>
        <Form.Item name="confirm_password" label="Повторите новый пароль" dependencies={['new_password']}
          rules={[{ required: true, message: 'Повторите пароль' }, ({ getFieldValue }) => ({ validator(_, value) {
            return !value || getFieldValue('new_password') === value ? Promise.resolve() : Promise.reject(new Error('Пароли не совпадают'));
          } })]}>
          <Input.Password autoComplete="new-password" maxLength={128} size="large" />
        </Form.Item>
        <Button type="primary" htmlType="submit" size="large" loading={busy}>Сохранить пароль</Button>
      </Form>}
    </>}
  </section>;
}
