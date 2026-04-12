import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { catalogApi } from '@/features/common/api/catalog';
import { AppSelect } from '@/components/ui';
import styles from '../modals/MessageModalNew.module.css';

interface SpecializationSelectorProps {
  value?: number;
  onChange?: (value: number) => void;
  placeholder?: string;
  isMobile?: boolean;
  isTablet?: boolean;
  isDesktop?: boolean;
  variant?: 'default' | 'compact';
}

const SpecializationSelector: React.FC<SpecializationSelectorProps> = ({
  value,
  onChange,
  placeholder = "Выберите специализацию",
  isMobile = false,
  isTablet = false,
  isDesktop = true,
  variant = 'default'
}) => {
  const { data: subjects = [], isLoading } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => catalogApi.getSubjects(),
  });

  const { data: workTypes = [], isLoading: workTypesLoading } = useQuery({
    queryKey: ['work-types'],
    queryFn: () => catalogApi.getWorkTypes(),
  });

  // Combine subjects and work types for specialization options
  const specializationOptions = [
    ...subjects
      .filter((s) => s.is_active !== false)
      .map((s) => ({ 
        value: `subject_${s.id}`, 
        label: `${s.name} (предмет)`,
        type: 'subject',
        id: s.id 
      })),
    ...workTypes
      .filter((w) => w.is_active !== false)
      .map((w) => ({ 
        value: `work_type_${w.id}`, 
        label: `${w.name} (тип работы)`,
        type: 'work_type',
        id: w.id 
      }))
  ];

  const getClassName = () => {
    if (isMobile) {
      return variant === 'compact' 
        ? styles.compactSpecializationSelector 
        : styles.specializationSelectorMobile;
    }
    if (isTablet) {
      return styles.specializationSelectorTablet;
    }
    return '';
  };

  const getPopupClassName = () => {
    if (isMobile) {
      return styles.specializationDropdownMobile;
    }
    if (isTablet) {
      return styles.specializationDropdownTablet;
    }
    return '';
  };

  const handleChange = (selectedValue: string) => {
    if (!onChange) return;
    
    const option = specializationOptions.find(opt => opt.value === selectedValue);
    if (option) {
      onChange(option.id);
    }
  };

  const selectedValue = value 
    ? specializationOptions.find(opt => opt.id === value)?.value 
    : undefined;

  return (
    <AppSelect
      className={getClassName()}
      popupClassName={getPopupClassName()}
      value={selectedValue}
      onChange={handleChange}
      placeholder={placeholder}
      loading={isLoading || workTypesLoading}
      showSearch
      optionFilterProp="label"
      options={specializationOptions}
      size={isMobile ? 'large' : 'middle'}
      dropdownStyle={{
        borderRadius: isMobile ? '16px' : isTablet ? '12px' : '8px',
      }}
    />
  );
};

export default SpecializationSelector;