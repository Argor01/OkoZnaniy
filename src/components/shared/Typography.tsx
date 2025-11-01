import React from 'react';

// Простая утилита для объединения классов
const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

export type TypographyCommonProps = {
  className?: string;
  children?: React.ReactNode;
};

export const TypographyH1: React.FC<React.HTMLAttributes<HTMLHeadingElement> & TypographyCommonProps> = ({
  className,
  children,
  ...props
}) => {
  return (
    <h1
      className={cx('font-display text-4xl md:text-5xl', className)}
      {...props}
    >
      {children}
    </h1>
  );
};

export const TypographyH2: React.FC<React.HTMLAttributes<HTMLHeadingElement> & TypographyCommonProps> = ({
  className,
  children,
  ...props
}) => {
  return (
    <h2
      className={cx('font-display text-2xl md:text-3xl font-semibold', className)}
      {...props}
    >
      {children}
    </h2>
  );
};

export const TypographyP: React.FC<React.HTMLAttributes<HTMLParagraphElement> & TypographyCommonProps> = ({
  className,
  children,
  ...props
}) => {
  return (
    <p className={cx('text-base leading-7 text-slate-300', className)} {...props}>
      {children}
    </p>
  );
};

export const TypographySpan: React.FC<React.HTMLAttributes<HTMLSpanElement> & TypographyCommonProps> = ({
  className,
  children,
  ...props
}) => {
  return (
    <span className={cx('text-slate-300', className)} {...props}>
      {children}
    </span>
  );
};

export default {
  TypographyH1,
  TypographyH2,
  TypographyP,
  TypographySpan,
};