import React, { useState, useEffect } from 'react';
import { useTypewriter } from './hooks/useTypewriter';

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
    <div className="chat-bubbles">
      <div className="bubble bubble-left">
        <span className="bubble-text">{bubbleQuestion}</span>
        {isQuestionLoading && (
          <span className="typing" aria-live="polite">
            <span className="dot" /><span className="dot" /><span className="dot" />
          </span>
        )}
      </div>
      <div className="send-ellipsis send-ellipsis-delay" aria-hidden="true">
        <span className="dot" /><span className="dot" /><span className="dot" />
      </div>
      <div className="bubble bubble-right bubble-right-delay">
        <span className="bubble-text">{bubbleAnswer}</span>
        {isAnswerLoading && (
          <span className="typing" aria-live="polite">
            <span className="dot" /><span className="dot" /><span className="dot" />
          </span>
        )}
      </div>
      <div className="bubble bubble-left bubble-left-2 bubble-left-2-delay">
        {thumbStage !== 'emoji' && (
          <span className="typing" aria-live="polite">
            <span className="dot" /><span className="dot" /><span className="dot" />
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
  );
};

export default ChatBubbles;
