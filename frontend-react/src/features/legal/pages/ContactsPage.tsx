import React from 'react';
import { Typography } from 'antd';
import { COMPANY, CARDHOLDER_CONTACT, PAYMENT_SYSTEMS } from '../companyInfo';
import styles from '../legal.module.css';

const { Title } = Typography;

/**
 * Страница «Контакты и реквизиты».
 * Закрывает п. 1.6 Приложения №3 банка-эквайера: почтовый адрес,
 * ОГРН, ИНН и контакты сотрудников, ответственных за общение
 * с держателями карт.
 */
const ContactsPage: React.FC = () => (
  <div className={styles.page}>
    <Title level={1} className={styles.title}>Контакты и реквизиты</Title>

    <section className={styles.section}>
      <h2>Как с нами связаться</h2>
      <p>
        Телефон: <a href={COMPANY.phoneHref}>{COMPANY.phone}</a> — звонок по России бесплатный.
      </p>
      <p>
        Электронная почта: <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
      </p>
      <p>Время работы: {COMPANY.workingHours}</p>
    </section>

    <section className={styles.section}>
      <h2>Вопросы оплаты, возвратов и спорных операций</h2>
      <p>{CARDHOLDER_CONTACT.role}:</p>
      <ul>
        <li>
          Электронная почта:{' '}
          <a href={`mailto:${CARDHOLDER_CONTACT.email}`}>{CARDHOLDER_CONTACT.email}</a>
        </li>
        <li>
          Телефон: <a href={CARDHOLDER_CONTACT.phoneHref}>{CARDHOLDER_CONTACT.phone}</a>
        </li>
        <li>Время работы: {CARDHOLDER_CONTACT.hours}</li>
      </ul>
      <div className={styles.note}>
        Если платёж не прошёл или вы не согласны со списанием — напишите нам на{' '}
        <a href={`mailto:${CARDHOLDER_CONTACT.email}`}>{CARDHOLDER_CONTACT.email}</a>.
        Мы отвечаем в течение одного рабочего дня.
      </div>
    </section>

    <section className={styles.section}>
      <h2>Реквизиты организации</h2>
      <table className={styles.requisites}>
        <tbody>
          <tr><th>Полное наименование</th><td>{COMPANY.fullName}</td></tr>
          <tr><th>Сокращённое наименование</th><td>{COMPANY.shortName}</td></tr>
          <tr><th>ОГРН</th><td>{COMPANY.ogrn}</td></tr>
          <tr><th>ИНН</th><td>{COMPANY.inn}</td></tr>
          <tr><th>КПП</th><td>{COMPANY.kpp}</td></tr>
          <tr><th>Дата регистрации</th><td>{COMPANY.registeredAt}</td></tr>
          <tr><th>Юридический адрес</th><td>{COMPANY.legalAddress}</td></tr>
          <tr><th>Почтовый адрес</th><td>{COMPANY.postalAddress}</td></tr>
          <tr><th>Основной вид деятельности</th><td>{COMPANY.okved}</td></tr>
        </tbody>
      </table>
    </section>

    <section className={styles.section}>
      <h2>Принимаем к оплате</h2>
      <div className={styles.logos}>
        {PAYMENT_SYSTEMS.map((s) => (
          <img key={s.alt} src={s.src} alt={s.alt} loading="lazy" />
        ))}
      </div>
    </section>
  </div>
);

export default ContactsPage;
