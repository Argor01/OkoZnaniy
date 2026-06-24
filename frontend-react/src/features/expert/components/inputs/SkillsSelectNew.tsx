import React from 'react';
import { Select, Modal, Input, Button, message, Spin } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { catalogApi } from '@/features/common/api/catalog';
import { POPULAR_SKILLS } from '@/config/skills';

interface SkillsSelectNewProps {
  value?: string[] | number[];
  onChange?: (value: any[]) => void;
  placeholder?: string;
  size?: 'small' | 'middle' | 'large';
  className?: string;
  disabled?: boolean;
  valueType?: 'id' | 'name';
  mode?: 'multiple' | 'tags';
  getPopupContainer?: (triggerNode: HTMLElement) => HTMLElement;
}

const SkillsSelectNew: React.FC<SkillsSelectNewProps> = ({
  value,
  onChange,
  placeholder = 'Выберите навыки или добавьте свои',
  size = 'large',
  className,
  disabled,
  valueType = 'name',
  mode = 'tags',
  getPopupContainer,
}) => {
  const queryClient = useQueryClient();
  const selectClassName = [className, 'fullWidthSelect'].filter(Boolean).join(' ');
  const [newSkillModalVisible, setNewSkillModalVisible] = React.useState(false);
  const [newSkillName, setNewSkillName] = React.useState('');

  const { data: skills = [], isLoading } = useQuery({
    queryKey: ['skills'],
    queryFn: () => catalogApi.getSkills(),
  });

  const createSkillMutation = useMutation({
    mutationFn: (name: string) => catalogApi.createSkill(name),
    onSuccess: (createdSkill) => {
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      setNewSkillModalVisible(false);
      setNewSkillName('');
      message.success('Новый навык добавлен');
      if (onChange) {
        const nextValue = valueType === 'id' ? createdSkill.id : createdSkill.name;
        const current: Array<string | number> = Array.isArray(value) ? [...value] : [];
        if (!current.includes(nextValue)) {
          onChange([...current, nextValue]);
        }
      }
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при добавлении навыка';
      message.error(errorMessage);
    },
  });

  const options = React.useMemo(() => {
    const apiOptions = skills.map((skill) => ({
      label: skill.name,
      value: valueType === 'id' ? skill.id : skill.name,
    }));

    if (valueType === 'id') {
      return apiOptions;
    }

    const merged = new Map<string, { label: string; value: string }>();
    for (const option of apiOptions) {
      merged.set(String(option.value).toLowerCase(), {
        label: String(option.label),
        value: String(option.value),
      });
    }
    for (const skillName of POPULAR_SKILLS) {
      const key = skillName.toLowerCase();
      if (!merged.has(key)) {
        merged.set(key, { label: skillName, value: skillName });
      }
    }

    return Array.from(merged.values()).sort((a, b) => a.label.localeCompare(b.label, 'ru'));
  }, [skills, valueType]);

  const notFoundContent = isLoading ? (
    <div style={{ padding: 12, textAlign: 'center' }}>
      <Spin size="small" />
    </div>
  ) : (
    'Нет навыков. Можно добавить свой.'
  );

  return (
    <>
      <Select
        mode={mode}
        size={size}
        placeholder={placeholder}
        className={selectClassName}
        value={value}
        onChange={onChange}
        options={options}
        loading={isLoading}
        notFoundContent={notFoundContent}
        maxTagCount="responsive"
        showSearch
        disabled={disabled}
        filterOption={(input, option) =>
          String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
        }
        getPopupContainer={getPopupContainer}
        popupRender={(menu) => (
          <>
            {menu}
            {!disabled && (
              <div style={{ padding: '8px 12px', borderTop: '1px solid #f0f0f0', background: '#fff' }}>
                <Button
                  type="text"
                  icon={<PlusOutlined />}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setNewSkillModalVisible(true)}
                  style={{ width: '100%', textAlign: 'left' }}
                >
                  Добавить новый навык
                </Button>
              </div>
            )}
          </>
        )}
      />
      <Modal
        title="Добавить новый навык"
        open={newSkillModalVisible}
        onOk={() => {
          const name = newSkillName.trim();
          if (!name) {
            message.error('Введите название навыка');
            return;
          }
          createSkillMutation.mutate(name);
        }}
        onCancel={() => {
          setNewSkillModalVisible(false);
          setNewSkillName('');
        }}
        confirmLoading={createSkillMutation.isPending}
      >
        <Input
          placeholder="Название навыка"
          value={newSkillName}
          onChange={(e) => setNewSkillName(e.target.value)}
          onPressEnter={() => {
            const name = newSkillName.trim();
            if (name) {
              createSkillMutation.mutate(name);
            }
          }}
        />
      </Modal>
    </>
  );
};

export default SkillsSelectNew;
