import React from 'react';
import { Select } from 'antd';
import { POPULAR_SPECIALIZATIONS } from '../config/specializations';

interface SpecializationsSelectProps {
  value?: string[];
  onChange?: (value: string[]) => void;
  placeholder?: string;
  size?: 'small' | 'middle' | 'large';
  style?: React.CSSProperties;
  className?: string;
}

const SpecializationsSelect: React.FC<SpecializationsSelectProps> = ({
  value,
  onChange,
  placeholder = 'Выберите или введите специализации',
  size = 'large',
  style,
  className
}) => {
  return (
    <Select
      mode="tags"
      size={size}
      placeholder={placeholder}
      style={{ width: '100%', ...style }}
      className={className}
      value={value}
      onChange={onChange}
      options={POPULAR_SPECIALIZATIONS.map(spec => ({ label: spec, value: spec }))}
      tokenSeparators={[',']}
      maxTagCount="responsive"
    />
  );
};

export default SpecializationsSelect;
