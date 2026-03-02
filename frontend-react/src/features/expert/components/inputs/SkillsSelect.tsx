import React from 'react';
import { Select } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { catalogApi } from '@/features/common/api/catalog';

interface SkillsSelectProps {
  value?: number[];
  onChange?: (value: number[]) => void;
  placeholder?: string;
  size?: 'small' | 'middle' | 'large';
  className?: string;
}

const SkillsSelect: React.FC<SkillsSelectProps> = ({
  value,
  onChange,
  placeholder = 'Выберите специальности',
  size = 'large',
  className
}) => {
  const selectClassName = [className, 'fullWidthSelect'].filter(Boolean).join(' ');

  const { data: subjects = [], isLoading } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => catalogApi.getSubjects(),
  });

  const options = React.useMemo(() => {
    return subjects.map((subject) => ({
      label: subject.name,
      value: subject.id
    }));
  }, [subjects]);

  return (
    <Select
      mode="multiple"
      size={size}
      placeholder={placeholder}
      className={selectClassName}
      value={value}
      onChange={onChange}
      options={options}
      loading={isLoading}
      maxTagCount="responsive"
      showSearch
      filterOption={(input, option) =>
        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
      }
    />
  );
};

export default SkillsSelect;
