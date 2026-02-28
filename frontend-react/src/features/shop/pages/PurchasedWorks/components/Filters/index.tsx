
import React from 'react';
import { Space } from 'antd';
import { SearchOutlined, FilterOutlined } from '@ant-design/icons';
import { FiltersState } from '@/features/shop/types';
import type { Subject, WorkType } from '@/features/common/api/catalog';
import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { AppSelect } from '@/components/ui/AppSelect';
import styles from './Filters.module.css';

const { Option } = AppSelect;

interface FiltersProps {
  filters: FiltersState;
  onFilterChange: (filters: FiltersState) => void;
  subjects: Subject[];
  workTypes: WorkType[];
}

const Filters: React.FC<FiltersProps> = ({ filters, onFilterChange, subjects, workTypes }) => {
  return (
    <div className={styles.container}>
      <Space size="middle" wrap className={styles.filters}>
        <AppInput
          placeholder="Поиск работ..."
          prefix={<SearchOutlined />}
          value={filters.search}
          onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
          className={styles.search}
          allowClear
        />

        <AppSelect
          placeholder="Предмет"
          value={filters.subjectId}
          onChange={(value) => onFilterChange({ ...filters, subjectId: value as number })}
          className={styles.select}
          allowClear
        >
          {subjects
            .filter((s) => s.is_active !== false)
            .map((subj) => (
              <Option key={subj.id} value={subj.id}>
                {subj.name}
              </Option>
            ))}
        </AppSelect>

        <AppSelect
          placeholder="Тип работы"
          value={filters.workTypeId}
          onChange={(value) => onFilterChange({ ...filters, workTypeId: value as number })}
          className={styles.select}
          allowClear
        >
          {workTypes
            .filter((w) => w.is_active !== false)
            .map((wt) => (
              <Option key={wt.id} value={wt.id}>
                {wt.name}
              </Option>
            ))}
        </AppSelect>

        <AppSelect
          placeholder="Сортировка"
          value={filters.sortBy}
          onChange={(value) => onFilterChange({ ...filters, sortBy: value })}
          className={styles.select}
        >
          <Option value="date">Новые</Option>
          <Option value="popular">Популярные</Option>
          <Option value="price-asc">Цена: по возрастанию</Option>
          <Option value="price-desc">Цена: по убыванию</Option>
          <Option value="rating">Рейтинг</Option>
        </AppSelect>

        <AppButton
          icon={<FilterOutlined />}
          onClick={() => onFilterChange({})}
          variant="secondary"
        >
          Сбросить
        </AppButton>
      </Space>
    </div>
  );
};

export default Filters;
