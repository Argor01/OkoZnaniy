import React from 'react';
import { Select, Modal, Input, Button, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { catalogApi } from '@/features/common/api/catalog';

interface SkillsSelectNewProps {
  value?: string[] | number[];
  onChange?: (value: any[]) => void;
  placeholder?: string;
  size?: 'small' | 'middle' | 'large';
  className?: string;
  disabled?: boolean;
  valueType?: 'id' | 'name';
  mode?: 'multiple' | 'tags';
}

const SkillsSelectNew: React.FC<SkillsSelectNewProps> = ({
  value,
  onChange,
  placeholder = 'Выберите навыки или добавьте свои',
  size = 'large',
  className,
  disabled,
  valueType = 'name',
  mode = 'tags'
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
    return skills.map((skill) => ({
      label: skill.name,
      value: valueType === 'id' ? skill.id : skill.name
    }));
  }, [skills, valueType]);

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
        maxTagCount="responsive"
        showSearch
        disabled={disabled}
        filterOption={(input, option) =>
          (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
        }
        popupRender={(menu) => (
          <>
            {menu}
            {!disabled && (
              <div style={{ padding: '8px 12px', borderTop: '1px solid #f0f0f0' }}>
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