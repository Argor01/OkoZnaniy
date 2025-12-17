import React from 'react';
import { Input, Select, Space, Button } from 'antd';
import { SearchOutlined, FilterOutlined } from '@ant-design/icons';
import { Filters as FiltersType } from '../../types';
import { mockCategories, mockSubjects } from '../../mockData';
import styles from './Filters.module.css';

const { Option } = Select;

interface FiltersProps {
  filters: FiltersType;
  onFilterChange: (filters: FiltersType) => void;
}

const Filters: React.FC<FiltersProps> = ({ filters, onFilterChange }) => {
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
          {mockSubjects.map((subj) => (
            <Option key={subj} value={subj}>
              {subj}
            </Option>
          ))}
        </Select>

        <Select
          placeholder="Сортировка"
          value={filters.sortBy}
          onChange={(value) => onFilterChange({ ...filters, sortBy: value })}
          className={styles.select}
          defaultValue="newness"
        >
          <Option value="newness">Новые</Option>
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
