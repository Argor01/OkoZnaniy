
import React from 'react';
import { Input, Select, Space, Button } from 'antd';
import { SearchOutlined, FilterOutlined } from '@ant-design/icons';
import { FiltersState } from '../../types';
import type { Subject, WorkType } from '../../../../api/catalog';
import { mockCategories } from '../../mockData';
import styles from './Filters.module.css';

const { Option } = Select;

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
        <Input
          placeholder="Поиск работ..."
          prefix={<SearchOutlined />}
          value={filters.search}
          onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
          className={styles.search}
          allowClear
        />

        <Select
          placeholder="Категория"
          value={filters.category}
          onChange={(value) => onFilterChange({ ...filters, category: value })}
          className={styles.select}
          allowClear
        >
          {mockCategories.map((cat) => (
            <Option key={cat} value={cat}>
              {cat}
            </Option>
          ))}
        </Select>

        <Select
          placeholder="Предмет"
          value={filters.subject}
          onChange={(value) => onFilterChange({ ...filters, subject: value })}
          className={styles.select}
          allowClear
        >
          <Option value="Все предметы">Все предметы</Option>
          {subjects
            .filter((s) => s.is_active !== false)
            .map((subj) => (
              <Option key={subj.id} value={subj.name}>
                {subj.name}
              </Option>
            ))}
        </Select>

        <Select
          placeholder="Тип работы"
          value={filters.workType}
          onChange={(value) => onFilterChange({ ...filters, workType: value })}
          className={styles.select}
          allowClear
        >
          <Option value="Все типы">Все типы</Option>
          {workTypes
            .filter((w) => w.is_active !== false)
            .map((wt) => (
              <Option key={wt.id} value={wt.name}>
                {wt.name}
              </Option>
            ))}
        </Select>

        <Select
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
        </Select>

        <Button
          icon={<FilterOutlined />}
          onClick={() => onFilterChange({})}
        >
          Сбросить
        </Button>
      </Space>
    </div>
  );
};

export default Filters;
