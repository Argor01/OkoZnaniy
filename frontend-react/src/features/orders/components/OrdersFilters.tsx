import React from 'react';
import { FilterOutlined, SearchOutlined } from '@ant-design/icons';
import { AppButton, AppInput, AppSelect } from '@/components/ui';
import type { Subject, WorkType } from '@/features/common/api/catalog';
import styles from '@/features/orders/pages/MyWorks/MyWorks.module.css';

interface OrdersFiltersProps {
  searchText: string;
  orderIdSearch: string;
  selectedSubject?: number;
  selectedWorkType?: number;
  budgetRange: [number, number];
  showFilters: boolean;
  subjects: Subject[];
  workTypes: WorkType[];
  isCompact: boolean;
  onSearchTextChange: (value: string) => void;
  onOrderIdSearchChange: (value: string) => void;
  onSelectedSubjectChange: (value: number | undefined) => void;
  onSelectedWorkTypeChange: (value: number | undefined) => void;
  onBudgetRangeChange: (value: [number, number]) => void;
  onShowFiltersChange: (value: boolean) => void;
}

export const OrdersFilters: React.FC<OrdersFiltersProps> = ({
  searchText,
  orderIdSearch,
  selectedSubject,
  selectedWorkType,
  budgetRange,
  showFilters,
  subjects,
  workTypes,
  isCompact,
  onSearchTextChange,
  onOrderIdSearchChange,
  onSelectedSubjectChange,
  onSelectedWorkTypeChange,
  onBudgetRangeChange,
  onShowFiltersChange,
}) => {
  return (
    <div className={styles.filtersBlock}>
      <div className={styles.filtersRowTop}>
        <AppInput
          placeholder="Поиск по названию или описанию..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => onSearchTextChange(e.target.value)}
          allowClear
          className={styles.searchInput}
        />
        <AppInput
          placeholder="Номер заказа"
          prefix="№"
          value={orderIdSearch}
          onChange={(e) => onOrderIdSearchChange(e.target.value.replace(/[^\d]/g, ''))}
          allowClear
          className={styles.orderIdInput}
        />
        <AppSelect
          placeholder="Предмет"
          className={styles.filterSelect}
          value={selectedSubject}
          onChange={onSelectedSubjectChange}
          allowClear
          showSearch
          optionFilterProp="label"
          suffixIcon={<FilterOutlined />}
          options={subjects.map((subject) => ({
            value: subject.id,
            label: subject.name,
          }))}
        />
        <AppSelect
          placeholder="Тип работы"
          className={styles.filterSelect}
          value={selectedWorkType}
          onChange={onSelectedWorkTypeChange}
          allowClear
          showSearch
          optionFilterProp="label"
          suffixIcon={<FilterOutlined />}
          options={workTypes.map((workType) => ({
            value: workType.id,
            label: workType.name,
          }))}
        />
      </div>
      <div className={styles.filtersToggleRow}>
        <AppButton
          variant="link"
          onClick={() => onShowFiltersChange(!showFilters)}
          className={styles.filtersToggle}
        >
          {showFilters
            ? 'Скрыть фильтры'
            : isCompact
              ? 'Фильтры и бюджет'
              : 'Показать больше фильтров'}
        </AppButton>
      </div>
      {showFilters && (
        <div className={styles.filtersAdvancedRow}>
          <div className={styles.budgetGroup}>
            <span className={styles.budgetLabel}>Бюджет:</span>
            <AppInput.Number
              min={0}
              max={budgetRange[1]}
              value={budgetRange[0]}
              onChange={(value) => onBudgetRangeChange([Number(value) || 0, budgetRange[1]])}
              placeholder="От"
              controls={false}
              className={styles.budgetInput}
              formatter={(value) => `${value} ₽`}
              parser={(value) => {
                const num = Number(String(value ?? '').replace(/[^\d.-]/g, ''));
                return Number.isFinite(num) ? num : 0;
              }}
            />
            <span>—</span>
            <AppInput.Number
              min={budgetRange[0]}
              max={1000000}
              value={budgetRange[1]}
              onChange={(value) => onBudgetRangeChange([budgetRange[0], Number(value) || 100000])}
              placeholder="До"
              controls={false}
              className={styles.budgetInput}
              formatter={(value) => `${value} ₽`}
              parser={(value) => {
                const num = Number(String(value ?? '').replace(/[^\d.-]/g, ''));
                return Number.isFinite(num) ? num : 0;
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
