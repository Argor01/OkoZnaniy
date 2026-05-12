import React, { useState, useEffect } from 'react';
import { useTypewriter } from './hooks/useTypewriter';
import styles from '@/features/auth/Login.module.css';

const QUESTION_TEXT = 'Можете сделать курсовую за час?';
const ANSWER_TEXT = 'Без проблем!';

const LEFT_DELAY = 600;
const LEFT_SPEED = 65;
const SEND_DURATION = 1200;
const SEND_DELAY = LEFT_DELAY + LEFT_SPEED * QUESTION_TEXT.length + 150;
const RIGHT_DELAY = SEND_DELAY + SEND_DURATION + 100;
const ANSWER_SPEED = 65;
const ANSWER_DOTS_DURATION = 1200;
const ANSWER_START_DELAY = RIGHT_DELAY + ANSWER_DOTS_DURATION;
const THUMB_DOTS_DELAY = ANSWER_START_DELAY + ANSWER_SPEED * ANSWER_TEXT.length + 150;
const THUMB_DOTS_DURATION = 1200;

const ChatBubbles: React.FC = () => {
  const [thumbStage, setThumbStage] = useState<'idle' | 'dots' | 'emoji'>('idle');

  useEffect(() => {
    const dotsTimer = setTimeout(() => setThumbStage('dots'), THUMB_DOTS_DELAY);
    const emojiTimer = setTimeout(() => setThumbStage('emoji'), THUMB_DOTS_DELAY + THUMB_DOTS_DURATION);
    return () => {
      clearTimeout(dotsTimer);
      clearTimeout(emojiTimer);
    };
  }, []);

  const bubbleQuestion = useTypewriter(QUESTION_TEXT, LEFT_SPEED, LEFT_DELAY);
  const isQuestionLoading = bubbleQuestion.length === 0;
  const bubbleAnswer = useTypewriter(ANSWER_TEXT, ANSWER_SPEED, ANSWER_START_DELAY);
  const isAnswerLoading = bubbleAnswer.length === 0;

  return (
    <div className={styles.chatBubbles}>
      <div className={`${styles.bubble} ${styles.bubbleLeft}`}>
        <span className={styles.bubbleText}>{bubbleQuestion}</span>
        {isQuestionLoading && (
          <span className={styles.typing} aria-live="polite">
            <span className={styles.dot} /><span className={styles.dot} /><span className={styles.dot} />
          </span>
        )}
      </div>
      <div className={`${styles.sendEllipsis} ${styles.sendEllipsisDelay}`} aria-hidden="true">
        <span className={styles.dot} /><span className={styles.dot} /><span className={styles.dot} />
      </div>
      <div className={`${styles.bubble} ${styles.bubbleRight} ${styles.bubbleRightDelay}`}>
        <span className={styles.bubbleText}>{bubbleAnswer}</span>
        {isAnswerLoading && (
          <span className={styles.typing} aria-live="polite">
            <span className={styles.dot} /><span className={styles.dot} /><span className={styles.dot} />
          </span>
        )}
      </div>
      <div className={`${styles.bubble} ${styles.bubbleLeft} ${styles.bubbleLeft2} ${styles.bubbleLeft2Delay}`}>
        {thumbStage !== 'emoji' && (
          <span className={styles.typing} aria-live="polite">
            <span className={styles.dot} /><span className={styles.dot} /><span className={styles.dot} />
          </span>
        )}
        {thumbStage === 'emoji' && (
          <img
            className={styles.bubbleThumbImg}
            src="https://smileysplanet.ru/smileys/apple/thumbs-up-1328.png"
            alt="thumb up"
            width={22}
            height={22}
            loading="eager"
          />
        )}
      </div>
    </div>
  );
};

export default ChatBubbles;
