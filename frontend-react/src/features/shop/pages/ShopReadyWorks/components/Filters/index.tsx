import React from 'react';
import { SearchOutlined, FilterOutlined } from '@ant-design/icons';
import { Filters as FiltersType } from '@/features/shop/types';
import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { AppSelect } from '@/components/ui/AppSelect';
import styles from './Filters.module.css';

const { Option } = AppSelect;

interface FiltersProps {
  filters: FiltersType;
  onFilterChange: (filters: FiltersType) => void;
  subjects: Array<{ id: number; name: string }>;
  workTypes: Array<{ id: number; name: string }>;
}

const Filters: React.FC<FiltersProps> = ({ filters, onFilterChange, subjects, workTypes }) => {
  return (
    <div className={styles.container}>
      <div className={styles.filters}>
        <div className={styles.field}>
          <AppInput
            placeholder="Поиск работ..."
            prefix={<SearchOutlined />}
            value={filters.search}
            onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
            className={styles.search}
            allowClear
          />
        </div>

        <div className={styles.field}>
          <AppSelect
            placeholder="Тип работы"
            value={filters.category}
            onChange={(value) => onFilterChange({ ...filters, category: value as number })}
            className={styles.select}
            allowClear
          >
            {workTypes.map((wt) => (
              <Option key={wt.id} value={wt.id}>
                {wt.name}
              </Option>
            ))}
          </AppSelect>
        </div>

        <div className={styles.field}>
          <AppSelect
            placeholder="Предмет"
            value={filters.subject}
            onChange={(value) => onFilterChange({ ...filters, subject: value as number })}
            className={styles.select}
            allowClear
          >
            {subjects.map((subj) => (
              <Option key={subj.id} value={subj.id}>
                {subj.name}
              </Option>
            ))}
          </AppSelect>
        </div>

        <div className={styles.field}>
          <AppSelect
            placeholder="Сортировка"
            value={filters.sortBy}
            onChange={(value) => onFilterChange({ ...filters, sortBy: value as FiltersType['sortBy'] })}
            className={styles.select}
            popupClassName={styles.sortPopup}
            defaultValue="newness"
          >
            <Option value="newness">Новые</Option>
            <Option value="popular">Популярные</Option>
            <Option value="price-asc">Цена: по возрастанию</Option>
            <Option value="price-desc">Цена: по убыванию</Option>
            <Option value="rating">Рейтинг</Option>
          </AppSelect>
        </div>

        <div className={styles.resetSlot}>
          <AppButton
            icon={
              <span className={styles.resetIcon} aria-hidden="true">
                <FilterOutlined />
              </span>
            }
            onClick={() => onFilterChange({ sortBy: 'newness' })}
            variant="secondary"
            className={styles.resetButton}
            title="Сбросить фильтры"
            aria-label="Сбросить фильтры"
          />
        </div>
      </div>
    </div>
  );
};

export default Filters;
