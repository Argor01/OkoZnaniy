import React from 'react';
import { AppInput } from './AppInput';
import styles from './BudgetRangeInput.module.css';

export interface BudgetRangeInputProps {
  value?: [number, number];
  onChange?: (range: [number, number]) => void;
  min?: number;
  max?: number;
  className?: string;
  inputClassName?: string;
  placeholderFrom?: string;
  placeholderTo?: string;
}

export const BudgetRangeInput: React.FC<BudgetRangeInputProps> = ({
  value = [0, 100000],
  onChange,
  min = 0,
  max = 1000000,
  className,
  inputClassName,
  placeholderFrom = 'От',
  placeholderTo = 'До',
}) => {
  const formatter = (val: number | string | undefined) => `${val} ₽`;

  const parser = (val: string | undefined) => {
    const num = Number(String(val ?? '').replace(/[^\d.-]/g, ''));
    return Number.isFinite(num) ? num : 0;
  };

  return (
    <div className={`${styles.budgetRange} ${className || ''}`}>
      <AppInput.Number
        min={min}
        max={value[1]}
        value={value[0]}
        onChange={(val) => onChange?.([Number(val) || 0, value[1]])}
        placeholder={placeholderFrom}
        controls={false}
        className={inputClassName || styles.budgetInput}
        formatter={formatter}
        parser={parser}
      />
      <span className={styles.separator}>—</span>
      <AppInput.Number
        min={value[0]}
        max={max}
        value={value[1]}
        onChange={(val) => onChange?.([value[0], Number(val) || max])}
        placeholder={placeholderTo}
        controls={false}
        className={inputClassName || styles.budgetInput}
        formatter={formatter}
        parser={parser}
      />
    </div>
  );
};
