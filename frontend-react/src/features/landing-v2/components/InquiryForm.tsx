import React, { useState } from 'react';
import styles from '../Opportunity.module.css';
export const vacancies = ['Администратор', 'Агент по клиентскому трафику', 'Менеджер по работе с партнёрами', 'Автор студенческих работ'];
export default function InquiryForm({kind, vacancy = '', onVacancyChange}: {kind: 'vacancy' | 'agency'; vacancy?: string; onVacancyChange?: (v: string) => void}) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [success, setSuccess] = useState(false);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); if (busy) return;
    const form = e.currentTarget; const data = new FormData(form);
    const phone = String(data.get('phone') || '').trim(); const email = String(data.get('email') || '').trim();
    if (!phone || !email) {setError('Укажите телефон и почту для связи.'); return;}
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/notifications/landing-inquiry/', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({kind, vacancy, name: data.get('name'), phone, email, message: data.get('message'), website: data.get('website'), consent: data.get('consent') === 'on'})});
      const result = await response.json();
      if (!response.ok) {
        const detail = Object.values(result).flat().join(' ');
        throw new Error(response.status === 429 ? 'Слишком много попыток. Позвоните нам или попробуйте позже.' : detail || 'Не удалось отправить заявку.');
      }
      setSuccess(true);
    } catch (err) {setError(err instanceof Error ? err.message : 'Ошибка соединения. Попробуйте ещё раз.');} finally {setBusy(false);}
  };
  return <section id="feedback" className={styles.feedback} aria-labelledby="feedback-title">
    <div><span className={styles.eyebrow}>Давайте знакомиться</span><h2 id="feedback-title">{kind === 'vacancy' ? 'Расскажи немного о себе' : 'Обсудим сотрудничество'}</h2>
      <p>{kind === 'vacancy' ? 'Выбери направление и оставь контакты. Обсудим задачи, опыт и условия работы.' : 'Оставьте контакты агентства. Поможем разместить первый заказ и подберём формат сотрудничества.'}</p>
      <a className={styles.phone} href="tel:+79314674652">+7 (931) 467-46-52</a><p className={styles.note}>Можно просто позвонить нам.</p>
    </div>
    {success ? <div className={styles.success} role="status"><h3>Заявка получена!</h3><p>Свяжемся с вами по указанным контактам. Спасибо за интерес к Око Знаний.</p><button type="button" onClick={() => setSuccess(false)}>Отправить ещё одну заявку</button></div> :
      <form onSubmit={submit} className={styles.form}>
        <fieldset disabled={busy}>
          {kind === 'vacancy' && <label>Направление<select required value={vacancy} onChange={e => onVacancyChange?.(e.target.value)}><option value="" disabled>Выберите вакансию</option>{vacancies.map(v => <option key={v}>{v}</option>)}</select></label>}
          <label>ФИО<input id="inquiry-name" name="name" autoComplete="name" required maxLength={120} /></label>
          <div className={styles.contacts}><label>Телефон<input name="phone" type="tel" autoComplete="tel" required maxLength={40} placeholder="+7 (___) ___-__-__" /></label><label>Email<input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@example.ru" /></label></div>
          <p className={styles.note}>Укажите ФИО, телефон и почту.</p>
          <label>{kind === 'vacancy' ? 'Об опыте и интересах' : 'Какие задачи решает ваше агентство'}<textarea name="message" rows={3} maxLength={3000} /></label>
          <div className={styles.honeypot} aria-hidden="true"><label>Сайт<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
          <label className={styles.consent}><input name="consent" type="checkbox" required /><span>Согласен с <a href="/docs/personal_data_processing.pdf" target="_blank" rel="noopener noreferrer">обработкой персональных данных</a> и <a href="/docs/privacy_policy.pdf" target="_blank" rel="noopener noreferrer">политикой конфиденциальности</a>.</span></label>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <button className={styles.primary} type="submit" disabled={busy}>{busy ? 'Отправляем…' : kind === 'vacancy' ? 'Отправить отклик' : 'Оставить заявку'}</button>
        </fieldset>
      </form>}
  </section>;
}
