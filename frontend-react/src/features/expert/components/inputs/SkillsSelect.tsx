import React from 'react';
import { Select } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { catalogApi } from '@/features/common/api/catalog';

interface SkillsSelectProps {
  value?: string[] | number[];
  onChange?: (value: any[]) => void;
  placeholder?: string;
  size?: 'small' | 'middle' | 'large';
  className?: string;
  disabled?: boolean;
  valueType?: 'id' | 'name';
  mode?: 'multiple' | 'tags';
}

const SkillsSelect: React.FC<SkillsSelectProps> = ({
  value,
  onChange,
  placeholder = 'Выберите навыки или добавьте свои',
  size = 'large',
  className,
  disabled,
  valueType = 'id',
  mode = 'multiple'
}) => {
  const selectClassName = [className, 'fullWidthSelect'].filter(Boolean).join(' ');

  const { data: subjects = [], isLoading } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => catalogApi.getSubjects(),
  });

  const options = React.useMemo(() => {
    return subjects.map((subject) => ({
      label: subject.name,
      value: valueType === 'id' ? subject.id : subject.name
    }));
  }, [subjects, valueType]);

  return (
    <Select
      mode={mode}
      size={size}
      placeholder={placeholder}
      className={selectClassName}
      value={value}
      onChange={onChange}
      options={options}
      loading={isLoading}
      maxTagCount="responsive"
      showSearch
      disabled={disabled}
      filterOption={(input, option) =>
        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
      }
    />
  );
};

export default SkillsSelect;
