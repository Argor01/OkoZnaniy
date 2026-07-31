import { useMemo } from 'react';
import { useSubjects, useWorkTypes } from './queries';

export const useSortedSubjects = () => {
  const query = useSubjects();
  const sorted = useMemo(
    () =>
      [...(query.data ?? [])].sort((a, b) =>
        (a.name ?? '').localeCompare(b.name ?? '', 'ru', { sensitivity: 'base' })
      ),
    [query.data]
  );
  return { ...query, data: sorted };
};

export const useSortedWorkTypes = () => {
  const query = useWorkTypes();
  const sorted = useMemo(
    () =>
      [...(query.data ?? [])].sort((a, b) =>
        (a.name ?? '').localeCompare(b.name ?? '', 'ru', { sensitivity: 'base' })
      ),
    [query.data]
  );
  return { ...query, data: sorted };
};
