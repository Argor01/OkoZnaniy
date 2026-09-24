import React, {useState} from 'react';
import {SEO} from '@/features/common';
import {TopBar,FooterDark} from '@/features/landing-v2/components/LandingChrome';
import InquiryForm,{vacancies} from '@/features/landing-v2/components/InquiryForm';
import styles from '@/features/landing-v2/Opportunity.module.css';
export default function Vacancies(){
const [vacancy,setVacancy]=useState('');
const apply=(v:string)=>{setVacancy(v);document.getElementById('feedback')?.scrollIntoView({behavior:'smooth'});window.setTimeout(()=>document.getElementById('inquiry-name')?.focus({preventScroll:true}),350)};
return <div className={styles.page}>
<SEO title="Вакансии для студентов | Око Знаний" description="Работа удалённо из любого города: администратор, агент, менеджер по партнёрам, автор студенческих работ. Откликнитесь онлайн." canonical="https://okoznaniy.ru/vacancies"/>
<TopBar links={[{href:'#vacancies',label:'Вакансии'},{href:'#feedback',label:'Откликнуться'}]}/>
<main className={styles.content}>
<section className={styles.compactHero}><div className={styles.compactHeroText}><span className={styles.eyebrow}>Работа в команде Око Знаний</span><h1>Вакансии для студентов</h1><p className={styles.lead}>Работай удалённо из любого города. Выбирай интересное направление и откликайся.</p></div><div className={styles.compactHeroImage}><img src="/assets/become/expert-hero.png" alt="Эксперт за работой" width="1408" height="768" /></div></section>
<section id="vacancies" className={styles.compactJobs} aria-label="Вакансии">
{vacancies.map((v,i)=><article className={styles.compactJob} key={v}><span className={styles.compactNum}>0{i+1} / вакансия</span><h2>{v}</h2><button type="button" onClick={()=>apply(v)}>Откликнуться ↗</button></article>)}
</section><InquiryForm kind="vacancy" vacancy={vacancy} onVacancyChange={setVacancy}/>
</main><FooterDark/></div>;
}
