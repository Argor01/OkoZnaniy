import React from 'react';
import { Select } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { catalogApi } from '@/features/common/api/catalog';

interface SkillsSelectProps {
  value?: string[];
  onChange?: (value: string[]) => void;
  placeholder?: string;
  size?: 'small' | 'middle' | 'large';
  className?: string;
}

const SkillsSelect: React.FC<SkillsSelectProps> = ({
  value,
  onChange,
  placeholder = 'Выберите или введите свои навыки',
  size = 'large',
  className
}) => {
  const selectClassName = [className, 'fullWidthSelect'].filter(Boolean).join(' ');

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => catalogApi.getSubjects(),
  });

  const options = React.useMemo(() => {
    const fromDb = subjects.map((s) => s.name).filter(Boolean);
    const unique: string[] = [];
    const seen = new Set<string>();
    for (const name of fromDb) {
      const normalized = String(name).trim();
      if (!normalized) continue;
      const key = normalized.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(normalized);
    }
    return unique.map((subject) => ({ label: subject, value: subject }));
  }, [subjects]);

  return (
    <Select
      mode="tags"
      size={size}
      placeholder={placeholder}
      className={selectClassName}
      value={value}
      onChange={(vals) => {
        const cleaned = (vals || []).map((v) => String(v).trim()).filter(Boolean);
        onChange?.(cleaned);
      }}
      options={options}
      tokenSeparators={[',']}
      maxTagCount="responsive"
    />
  );
};

export default SkillsSelect;
