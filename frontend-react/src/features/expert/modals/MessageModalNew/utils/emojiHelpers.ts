import type { DeviceEmojiFamily, EmojiVersionLevel } from '../types';

export const detectDeviceEmojiFamily = (): DeviceEmojiFamily => {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  if (/Windows/i.test(ua)) return 'windows';
  if (/Macintosh|Mac OS X/i.test(ua)) return 'mac';
  if (/Linux/i.test(ua)) return 'linux';
  return 'other';
};

const emojiVersionRank: Record<EmojiVersionLevel, number> = {
  '12.0': 12,
  '13.0': 13,
  '14.0': 14,
  '15.0': 15,
};

const clampEmojiVersion = (target: EmojiVersionLevel, detected: EmojiVersionLevel): EmojiVersionLevel =>
  emojiVersionRank[detected] <= emojiVersionRank[target] ? detected : target;

export const isEmojiRenderable = (emoji: string): boolean => {
  if (typeof document === 'undefined') return true;
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  if (!ctx) return true;

  const render = (symbol: string): Uint8ClampedArray => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.textBaseline = 'top';
    ctx.font = '28px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
    ctx.fillText(symbol, 0, 0);
    return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  };

  const sample = render(emoji);
  const fallback = render('\uFFFD');

  for (let i = 0; i < sample.length; i += 1) {
    if (sample[i] !== fallback[i]) return true;
  }
  return false;
};

export const resolveEmojiVersionByDevice = (family: DeviceEmojiFamily): EmojiVersionLevel => {
  const targetByFamily: Record<DeviceEmojiFamily, EmojiVersionLevel> = {
    ios: '15.0',
    android: '14.0',
    windows: '13.0',
    mac: '15.0',
    linux: '13.0',
    other: '13.0',
  };

  const target = targetByFamily[family];
  if (isEmojiRenderable('🩷')) return clampEmojiVersion(target, '15.0');
  if (isEmojiRenderable('🫶')) return clampEmojiVersion(target, '14.0');
  if (isEmojiRenderable('🥲')) return clampEmojiVersion(target, '13.0');
  return '12.0';
};
