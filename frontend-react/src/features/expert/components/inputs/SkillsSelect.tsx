import React from 'react';
import { Select, Modal, Input, Button, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { catalogApi } from '@/features/common/api/catalog';

interface SkillsSelectProps {
  value?: string[] | number[];
  onChange?: (value: any[]) => void;
  placeholder?: string;
  size?: 'small' | 'middle' | 'large';
  className?: string;
  disabled?: boolean;
  valueType?: 'id' | 'name';
  mode?: 'multiple' | 'tags';
  allowCreateSubject?: boolean;
}

const SkillsSelect: React.FC<SkillsSelectProps> = ({
  value,
  onChange,
  placeholder = 'Выберите навыки или добавьте свои',
  size = 'large',
  className,
  disabled,
  valueType = 'id',
  mode = 'multiple',
  allowCreateSubject = false
}) => {
  const queryClient = useQueryClient();
  const selectClassName = [className, 'fullWidthSelect'].filter(Boolean).join(' ');
  const [newSubjectModalVisible, setNewSubjectModalVisible] = React.useState(false);
  const [newSubjectName, setNewSubjectName] = React.useState('');

  const { data: subjects = [], isLoading } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => catalogApi.getSubjects(),
  });

  const createSubjectMutation = useMutation({
    mutationFn: (name: string) => catalogApi.createSubject(name),
    onSuccess: (createdSubject) => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      setNewSubjectModalVisible(false);
      setNewSubjectName('');
      message.success('Новый предмет добавлен');
      if (onChange) {
        const nextValue = valueType === 'id' ? createdSubject.id : createdSubject.name;
        const current: Array<string | number> = Array.isArray(value) ? [...value] : [];
        if (!current.includes(nextValue)) {
          onChange([...current, nextValue]);
        }
      }
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при добавлении предмета';
      message.error(errorMessage);
    },
  });

  const options = React.useMemo(() => {
    return subjects.map((subject) => ({
      label: subject.name,
      value: valueType === 'id' ? subject.id : subject.name
    }));
  }, [subjects, valueType]);

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
            {allowCreateSubject && !disabled && (
              <div style={{ padding: '8px 12px', borderTop: '1px solid #f0f0f0' }}>
                <Button
                  type="text"
                  icon={<PlusOutlined />}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setNewSubjectModalVisible(true)}
                  style={{ width: '100%', textAlign: 'left' }}
                >
                  Добавить новый предмет
                </Button>
              </div>
            )}
          </>
        )}
      />
      <Modal
        title="Добавить новый предмет"
        open={newSubjectModalVisible}
        onOk={() => {
          const name = newSubjectName.trim();
          if (!name) {
            message.error('Введите название предмета');
            return;
          }
          createSubjectMutation.mutate(name);
        }}
        onCancel={() => {
          setNewSubjectModalVisible(false);
          setNewSubjectName('');
        }}
        confirmLoading={createSubjectMutation.isPending}
      >
        <Input
          placeholder="Название предмета"
          value={newSubjectName}
          onChange={(e) => setNewSubjectName(e.target.value)}
          onPressEnter={() => {
            const name = newSubjectName.trim();
            if (name) {
              createSubjectMutation.mutate(name);
            }
          }}
        />
      </Modal>
    </>
  );
};

export default SkillsSelect;
