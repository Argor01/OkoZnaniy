import React, { useState, useCallback } from 'react';
import { message } from 'antd';
import dayjs from 'dayjs';
import { AppDatePicker } from './AppDatePicker';
import { AppSelect } from './AppSelect';
import styles from './DeadlinePicker.module.css';

export interface DeadlineTimeValues {
  hours: number;
  minutes: number;
}

export interface DeadlinePickerProps {
  value?: dayjs.Dayjs | null;
  onChange?: (date: dayjs.Dayjs | null) => void;
  timeValue?: DeadlineTimeValues;
  onTimeChange?: (time: DeadlineTimeValues) => void;
  className?: string;
  timeClassName?: string;
}

export const DeadlinePicker: React.FC<DeadlinePickerProps> = ({
  value,
  onChange,
  timeValue,
  onTimeChange,
  className,
  timeClassName,
}) => {
  const [internalTime, setInternalTime] = useState<DeadlineTimeValues>({ hours: 12, minutes: 0 });

  const time = timeValue ?? internalTime;
  const setTime = onTimeChange ?? setInternalTime;

  const handleDateChange = useCallback(
    (date: dayjs.Dayjs | null) => {
      if (date) {
        const now = dayjs();
        if (date.isSame(now, 'day')) {
          if (
            time.hours < now.hour() ||
            (time.hours === now.hour() && time.minutes <= now.minute())
          ) {
            const newTime = {
              hours: Math.min(now.hour() + 1, 23),
              minutes: 0,
            };
            setTime(newTime);
          }
        }
      }
      onChange?.(date);
    },
    [time, onChange, setTime]
  );

  const handleTimeChange = useCallback(
    (field: 'hours' | 'minutes', val: number) => {
      const newTime = { ...time, [field]: val };
      setTime(newTime);

      if (value && value.isSame(dayjs(), 'day')) {
        const now = dayjs();
        if (
          newTime.hours < now.hour() ||
          (newTime.hours === now.hour() && newTime.minutes <= now.minute())
        ) {
          message.warning('Выбранное время уже прошло');
        }
      }
    },
    [time, value, setTime]
  );

  return (
    <div className={`${styles.deadlineWrapper} ${className || ''}`}>
      <AppDatePicker
        value={value}
        placeholder="Дата сдачи"
        format="DD.MM.YYYY"
        disabledDate={(current) => current && current < dayjs().startOf('day')}
        onChange={handleDateChange}
        className={styles.dateField}
      />
      <div className={`${styles.timeSelectors} ${timeClassName || ''}`}>
        <div className={styles.timeFieldWrapper}>
          <label className={styles.timeLabel}>Часы</label>
          <AppSelect
            value={time.hours}
            onChange={(val) => handleTimeChange('hours', val)}
            className={styles.timeSelect}
          >
            {Array.from({ length: 24 }, (_, i) => (
              <AppSelect.Option key={i} value={i}>
                {String(i).padStart(2, '0')}
              </AppSelect.Option>
            ))}
          </AppSelect>
        </div>
        <span className={styles.timeSeparator}>:</span>
        <div className={styles.timeFieldWrapper}>
          <label className={styles.timeLabel}>Минуты</label>
          <AppSelect
            value={time.minutes}
            onChange={(val) => handleTimeChange('minutes', val)}
            className={styles.timeSelect}
          >
            {Array.from({ length: 60 }, (_, i) => (
              <AppSelect.Option key={i} value={i}>
                {String(i).padStart(2, '0')}
              </AppSelect.Option>
            ))}
          </AppSelect>
        </div>
      </div>
    </div>
  );
};
