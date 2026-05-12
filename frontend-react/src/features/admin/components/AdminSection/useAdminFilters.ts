import { useState, useMemo, useCallback } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import type { FilterConfig, FilterState } from './types';

export function useAdminFilters<T extends Record<string, any>>(
  data: T[],
  filters: FilterConfig[] = [],
  searchFields: (keyof T)[] = [],
) {
  const defaultFilters = useMemo(() => {
    const defaults: Record<string, string | boolean> = {};
    for (const f of filters) {
      if (f.type === 'toggle') {
        defaults[f.key] = f.defaultValue ?? false;
      } else if (f.type === 'select') {
        defaults[f.key] = (f.defaultValue as string) ?? 'all';
      }
    }
    return defaults;
  }, [filters]);

  const [searchText, setSearchText] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, string | boolean>>(defaultFilters);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);

  const setFilter = useCallback((key: string, value: string | boolean) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setSearchText('');
    setFilterValues(defaultFilters);
    setDateRange(null);
  }, [defaultFilters]);

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      if (searchText) {
        const searchLower = searchText.toLowerCase();
        const matchesSearch = searchFields.some((field) => {
          const value = item[field];
          if (typeof value === 'string') return value.toLowerCase().includes(searchLower);
          if (typeof value === 'number') return String(value).includes(searchLower);
          if (typeof value === 'object' && value !== null) {
            return JSON.stringify(value).toLowerCase().includes(searchLower);
          }
          return false;
        });
        if (!matchesSearch) return false;
      }

      for (const f of filters) {
        const filterValue = filterValues[f.key];
        if (f.type === 'select' && filterValue && filterValue !== 'all') {
          const itemValue = String(getNestedValue(item, f.key) ?? '');
          if (itemValue !== filterValue) return false;
        }
        if (f.type === 'toggle' && filterValue === true) {
          const itemValue = getNestedValue(item, f.key);
          if (!itemValue) return false;
        }
      }

      if (dateRange) {
        const createdAt = dayjs(item.created_at);
        if (!createdAt.isAfter(dateRange[0]) || !createdAt.isBefore(dateRange[1])) {
          return false;
        }
      }

      return true;
    });
  }, [data, searchText, filterValues, dateRange, filters, searchFields]);

  return {
    searchText,
    setSearchText,
    filterValues,
    setFilter,
    dateRange,
    setDateRange,
    resetFilters,
    filteredData,
  };
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((acc, part) => acc?.[part], obj);
}
