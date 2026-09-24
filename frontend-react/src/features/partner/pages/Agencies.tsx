import React from 'react';
import {SEO} from '@/features/common';
import {TopBar,FooterDark} from '@/features/landing-v2/components/LandingChrome';
import InquiryForm from '@/features/landing-v2/components/InquiryForm';
import styles from '@/features/landing-v2/Opportunity.module.css';
const benefits=[['Более 10 000 профессиональных авторов','Выбирайте исполнителя под тему и сроки.'],['Цены ниже рынка','Сравнивайте предложения авторов и согласовывайте стоимость.'],['Расширенная гарантия на работу','Условия гарантии и доработок обсуждаем до заказа.'],['Прямое общение','Уточняйте детали с автором в чате платформы.']];
export default function Agencies(){return <div className={styles.page}>
<SEO title="Агентствам | Око Знаний" description="Размещайте заказы и общайтесь напрямую с авторами без комиссии. Более 10 000 авторов, цены ниже рынка и расширенная гарантия." canonical="https://okoznaniy.ru/agencies"/>
<TopBar links={[{href:'#benefits',label:'Преимущества'},{href:'#feedback',label:'Связаться'}]}/>
<main className={styles.content}>
<section className={styles.compactHero}><div className={styles.compactHeroText}><span className={styles.eyebrow}>Око Знаний · Для агентств</span><h1>Агентствам</h1><span className={styles.zeroCommission}>0% комиссии</span><p className={styles.lead}>Работайте напрямую с авторами без комиссии.</p><p>Размещайте заказы у нас, выбирайте исполнителя и связывайтесь с ним напрямую в чате платформы.</p><a className={styles.primary} href="#feedback">Оставить заявку ↗</a></div><div className={styles.compactHeroImage}><img src="/assets/become/partner-hero.png" alt="Сотрудничество с авторами" width="1408" height="768" /></div></section>
<section id="benefits" className={styles.compactBenefits} aria-label="Преимущества для агентств">{benefits.map(([title,description],i)=><article className={styles.compactBenefit} key={title}><span className={styles.compactNum}>0{i+1}</span><h2>{title}</h2><p>{description}</p></article>)}</section>
<InquiryForm kind="agency"/></main><FooterDark/></div>}
