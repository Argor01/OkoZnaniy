import React from 'react';
import { Select } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { POPULAR_SKILLS } from '../config/skills';
import { catalogApi } from '../api/catalog';

interface SkillsSelectProps {
  value?: string[];
  onChange?: (value: string[]) => void;
  placeholder?: string;
  size?: 'small' | 'middle' | 'large';
  style?: React.CSSProperties;
  className?: string;
}

const SkillsSelect: React.FC<SkillsSelectProps> = ({
  value,
  onChange,
  placeholder = 'Выберите или введите свои навыки',
  size = 'large',
  style,
  className
}) => {
  const queryClient = useQueryClient();

  const { data: dbSkills = [] } = useQuery({
    queryKey: ['catalog-skills'],
    queryFn: () => catalogApi.getSkills(),
  });

  const createSkillMutation = useMutation({
    mutationFn: (name: string) => catalogApi.createSkill(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog-skills'] });
    },
  });

  const dbSkillNamesLower = React.useMemo(() => {
    return new Set(dbSkills.map((s) => s.name.trim().toLowerCase()).filter(Boolean));
  }, [dbSkills]);

  const options = React.useMemo(() => {
    const fromDb = dbSkills.map((s) => s.name).filter(Boolean);
    const merged = [...POPULAR_SKILLS, ...fromDb];
    const unique: string[] = [];
    const seen = new Set<string>();
    for (const name of merged) {
      const normalized = String(name).trim();
      if (!normalized) continue;
      const key = normalized.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(normalized);
    }
    return unique.map((skill) => ({ label: skill, value: skill }));
  }, [dbSkills]);

  return (
    <Select
      mode="tags"
      size={size}
      placeholder={placeholder}
      style={{ width: '100%', ...style }}
      className={className}
      value={value}
      onChange={(vals) => {
        const cleaned = (vals || []).map((v) => String(v).trim()).filter(Boolean);
        onChange?.(cleaned);

        for (const v of cleaned) {
          const key = v.toLowerCase();
          if (!dbSkillNamesLower.has(key)) {
            createSkillMutation.mutate(v);
          }
        }
      }}
      options={options}
      tokenSeparators={[',']}
      maxTagCount="responsive"
    />
  );
};

export default SkillsSelect;
