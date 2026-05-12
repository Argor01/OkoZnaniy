import { useState, useEffect } from 'react';

export function useTypewriter(fullText: string, speed = 35, startDelay = 0) {
  const [text, setText] = useState('');
  useEffect(() => {
    let i = 0;
    let intervalId: any = null;
    const startTimer = setTimeout(() => {
      intervalId = setInterval(() => {
        i += 1;
        setText(fullText.slice(0, i));
        if (i >= fullText.length) clearInterval(intervalId);
      }, speed);
    }, startDelay);
    return () => {
      clearTimeout(startTimer);
      if (intervalId) clearInterval(intervalId);
    };
  }, [fullText, speed, startDelay]);
  return text;
}
