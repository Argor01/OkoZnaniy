import React, { useEffect, useRef, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';
import type { Swiper as SwiperInstance } from 'swiper';
import landingStyles from '@/features/landing/Landing.module.css';
import styles from './Reviews.module.css';

interface Review {
  id: number;
  name: string;
  workType: string;
  text: string;
  rating: number;
}

const reviews: Review[] = [
  {
    id: 1,
    name: 'maxim.hood98',
    workType: 'Контрольная работа',
    text: 'Заказал контрольную по высшей математике — благодаря ребятам, получил свою первую пятёрку по этому предмету. Написал им вечером, а к утру у меня уже было готовое решение с подробными пояснениями. Особенно порадовало, что объяснили сложные моменты простыми словами — прям как надо! Сдал работу, никогда ещё так не радовался. Спасибо огромное, теперь знаю, где искать помощь в будущем!',
    rating: 5
  },
  {
    id: 2,
    name: 'vera_naushnik',
    workType: 'Презентация',
    text: 'Очень быстро сделали презентацию по философии. Красочно и ничего лишнего — оформили и слайды, и текст для выступления. Отдельно хочу отметить, что учли мои пожелания: добавили несколько современных примеров, чтобы материал не был "сухим", а ещё помогли подобрать интересные цитаты. Благодаря этой работе получила зачёт без проблем, и даже одногруппники просили поделиться примером для себя. Удобно, что всё онлайн — экономит кучу времени!',
    rating: 5
  },
  {
    id: 3,
    name: 'dima.truba',
    workType: 'Отчёт по практике',
    text: 'Брал отчёт по практике — все расписали грамотно, оформили по стандартам моего вуза, добавили реальные данные с предприятия. Переписали пару разделов под мои конкретные условия, всегда были на связи по всем вопросам. Преподаватель остался доволен, отметил основательность работы и оформление журналов отчёта. Доволен абсолютно всем, теперь планирую брать тут диплом.',
    rating: 5
  },
  {
    id: 4,
    name: 'katusha.sunny',
    workType: 'Дипломная работа',
    text: 'Нашла эту биржу через друзей, когда поняла, что на диплом времени совсем нет. Получила дипломный проект полностью под ключ: сделали не только теорию, но и расчёты, схему, презентацию и даже список литературы с актуальными источниками. В антиплагиате совпадений практически не было, а если попались — быстро помогли переделать. Сдала без единой правки! Теперь рекомендую всем одногруппникам',
    rating: 5
  },
  {
    id: 5,
    name: 'nastja.artem',
    workType: 'Эссе',
    text: 'Попросила выполнить эссе по менеджменту. Менеджер внимательно уточнил тему, необходимые источники и даже стиль письма, чтобы всё соответствовало моим требованиям. Получила очень структурированный и грамотный текст, с отличной аргументацией и тщательной проверкой на уникальность. Преподаватель похвалил, а мне не пришлось сидеть ночами за Google. Буду обращаться ещё!',
    rating: 5
  },
  {
    id: 6,
    name: 'tamara_liv',
    workType: 'Курсовая работа',
    text: 'Моя история с этой биржей началась с курсовой по психологии, которую вообще не знала с чего начать. Оформили работу быстро и чётко. Также в презентацию добавили примеры из современной практики, что было особенно приятно. С преподавателем проблем не возникло, заняла первое место на потоке благодаря этой работе! Теперь здесь беру любые сложные задания, не переживая о результате.',
    rating: 5
  },
  {
    id: 7,
    name: 'linodashka',
    workType: 'Домашняя работа',
    text: 'Домашка по английскому всегда отнимала кучу времени, а тут за пару часов сделали задание и прислали подробные разъяснения по каждому пункту. Указали на типичные грамматические ошибки, которые я делаю, и объяснили, как их избежать в будущем! Прямо мини-обучение, а не просто списывание. В итоге получила максимум баллов, а заодно подтянула язык. Теперь смело заказываю срочные работы — всегда успевают.',
    rating: 5
  },
  {
    id: 8,
    name: '9daniel_tsoi',
    workType: 'Расчётно-графическая работа',
    text: 'Расчётно-графическая по строительству — это каждый раз стресс из-за требований к оформлению. Решил не мучиться и заказал всё сразу на бирже: расчёты, чертежи, пояснительную записку. Приятно удивили вниманием к деталям — учли даже мелкие требования моего препода по ГОСТам. Приняли без единой доработки. Огромный плюс, что можно заказ делать пакетно и не тратить время на согласования.',
    rating: 5
  },
  {
    id: 9,
    name: 'sergei_online',
    workType: 'Реферат',
    text: 'Реферат по истории надо было сдать буквально за ночь! Ребята всё сделали в рекордные сроки, прислали оригинальный текст с грамотными ссылками и уникальной структурой. ни одного замечания у преподавателя не было: сразу в журнал "отлично". Оказалось — вообще несложно, если найти хороших исполнителей.',
    rating: 5
  }
];

const ReviewSlide: React.FC<{ review: Review }> = ({ review }) => (
  <div className={styles.reviewsSliderSlide}>
    <div className={styles.reviewsSliderSlideName}>{review.name}</div>
    <div className={styles.reviewsSliderSlideType}>{review.workType}</div>
    <div className={styles.reviewsSliderSlideText}>{review.text}</div>
    <div className={styles.reviewsSliderSlideBottom}>
      <div className={styles.reviewsSliderSlideRating}>
        {[...Array(review.rating)].map((_, index) => (
          <div key={index} className={styles.reviewsSliderSlideRatingStar}></div>
        ))}
      </div>
    </div>
  </div>
);

const Reviews: React.FC = () => {
  const prevRef = useRef<HTMLButtonElement | null>(null);
  const nextRef = useRef<HTMLButtonElement | null>(null);
  const paginationRef = useRef<HTMLDivElement | null>(null);
  const [swiper, setSwiper] = useState<SwiperInstance | null>(null);

  useEffect(() => {
    if (!swiper) return;

    
    if (prevRef.current && nextRef.current) {
      (swiper.params as any).navigation = (swiper.params as any).navigation || {};
      (swiper.params as any).navigation.prevEl = prevRef.current;
      (swiper.params as any).navigation.nextEl = nextRef.current;
      swiper.navigation.destroy();
      swiper.navigation.init();
      swiper.navigation.update();
    }

    
    if (paginationRef.current) {
      (swiper.params as any).pagination = (swiper.params as any).pagination || {};
      (swiper.params as any).pagination.el = paginationRef.current;
      (swiper.params as any).pagination.clickable = true;
      (swiper.params as any).pagination.bulletClass = 'swiper-pagination-bullet';
      (swiper.params as any).pagination.bulletActiveClass = 'swiper-pagination-bullet-active';
      swiper.pagination.destroy();
      swiper.pagination.init();
      swiper.pagination.update();
    }
  }, [swiper]);

  return (
    <section className={styles.reviews} id="reviews">
      <div className={landingStyles.mcontainer}>
        <h2 className={styles.reviewsTitle}>
          Око знаний открывает новые горизонты в учёбе. В раздумьях, довериться ли нам?
        </h2>

        <div className={styles.reviewsDescription}>
          Почитай отзывы студентов, которые воспользовались сервисом и решили учится по-новому! 👊🏻
        </div>

        <div className={styles.reviewsSlider}>
          <Swiper
            modules={[Pagination, Navigation]}
            spaceBetween={30}
            slidesPerView={1}
            breakpoints={{
              640: { slidesPerView: 2 },
              1024: { slidesPerView: 3 },
            }}
            onSwiper={setSwiper}
            className="swiper"
          >
            {reviews.map((review) => (
              <SwiperSlide key={review.id} className="swiper-slide">
                <ReviewSlide review={review} />
              </SwiperSlide>
            ))}
          </Swiper>

          <div className={styles.reviewsSliderControls}>
            <button ref={prevRef} className={styles.reviewsSliderControlsPrev} aria-label="Предыдущий отзыв"></button>
            <div ref={paginationRef} className={styles.reviewsSliderControlsPagination}></div>
            <button ref={nextRef} className={styles.reviewsSliderControlsNext} aria-label="Следующий отзыв"></button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Reviews;

