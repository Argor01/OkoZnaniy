import React from 'react';
import { Select } from 'antd';
import { POPULAR_SKILLS } from '../config/skills';

interface SkillsSelectProps {
  value?: string[];
  onChange?: (value: string[]) => void;
  placeholder?: string;
  size?: 'small' | 'middle' | 'large';
  style?: React.CSSProperties;
  className?: string;
}

const SkillsSelect: React.FC<SkillsSelectProps> = ({
  value,
  onChange,
  placeholder = 'Выберите или введите свои навыки',
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
      options={POPULAR_SKILLS.map(skill => ({ label: skill, value: skill }))}
      tokenSeparators={[',']}
      maxTagCount="responsive"
    />
  );
};

export default SkillsSelect;
