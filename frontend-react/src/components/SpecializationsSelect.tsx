import React from 'react';
import { Select } from 'antd';
import { POPULAR_SPECIALIZATIONS } from '../config/specializations';

interface SpecializationsSelectProps {
  value?: string[];
  onChange?: (value: string[]) => void;
  placeholder?: string;
  size?: 'small' | 'middle' | 'large';
  className?: string;
}

const SpecializationsSelect: React.FC<SpecializationsSelectProps> = ({
  value,
  onChange,
  placeholder = 'Выберите или введите специализации',
  size = 'large',
  className
}) => {
  const selectClassName = [className, 'fullWidthSelect'].filter(Boolean).join(' ');

  return (
    <Select
      mode="tags"
      size={size}
      placeholder={placeholder}
      className={selectClassName}
      value={value}
      onChange={onChange}
      options={POPULAR_SPECIALIZATIONS.map(spec => ({ label: spec, value: spec }))}
      tokenSeparators={[',']}
      maxTagCount="responsive"
    />
  );
};

export default SpecializationsSelect;
