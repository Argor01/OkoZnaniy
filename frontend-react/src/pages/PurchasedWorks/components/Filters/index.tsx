import React from 'react';
import { Input, Select, Space } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { FiltersState } from '../../types';
import styles from './Filters.module.css';

const { Option } = Select;

interface FiltersProps {
  filters: FiltersState;
  onFilterChange: (filters: FiltersState) => void;
}

const Filters: React.FC<FiltersProps> = ({ filters, onFilterChange }) => {
  return (
    <div className={styles.filters}>
      <Space size="middle" wrap style={{ width: '100%' }}>
        <Input
          placeholder="Поиск по названию..."
          prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
          value={filters.search}
          onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
          className={styles.searchInput}
          allowClear
        />

        <Select
          placeholder="Тип работы"
          value={filters.type}
          onChange={(value) => onFilterChange({ ...filters, type: value })}
          className={styles.select}
          allowClear
        >
          <Option value="Курсовая работа">Курсовая работа</Option>
          <Option value="Лабораторная работа">Лабораторная работа</Option>
          <Option value="Реферат">Реферат</Option>
          <Option value="Эссе">Эссе</Option>
          <Option value="Дипломная работа">Дипломная работа</Option>
        </Select>

        <Select
          placeholder="Предмет"
          value={filters.subject}
          onChange={(value) => onFilterChange({ ...filters, subject: value })}
          className={styles.select}
          allowClear
        >
          <Option value="Информатика">Информатика</Option>
          <Option value="Физика">Физика</Option>
          <Option value="История">История</Option>
          <Option value="Математика">Математика</Option>
          <Option value="Литература">Литература</Option>
        </Select>

        <Select
          placeholder="Статус"
          value={filters.status}
          onChange={(value) => onFilterChange({ ...filters, status: value })}
          className={styles.select}
          allowClear
        >
          <Option value="all">Все</Option>
          <Option value="downloaded">Скачанные</Option>
          <Option value="not-downloaded">Не скачанные</Option>
        </Select>

        <Select
          value={filters.sortBy}
          onChange={(value) => onFilterChange({ ...filters, sortBy: value })}
          className={styles.select}
        >
          <Option value="date">По дате покупки</Option>
          <Option value="price-asc">По цене (возр.)</Option>
          <Option value="price-desc">По цене (убыв.)</Option>
        </Select>
      </Space>
    </div>
  );
};

export default Filters;
