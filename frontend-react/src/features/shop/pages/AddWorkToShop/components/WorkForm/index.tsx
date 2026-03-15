import React, { useState } from 'react';
import { Space, Row, Col, Typography, message, Modal } from 'antd';
import { InboxOutlined, PlusOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { catalogApi } from '@/features/common/api/catalog';
import { RichTextEditor } from '@/features/common';
import { WorkFormProps, WorkFormData } from '@/features/shop/types';
import { Subject, WorkType } from '@/features/common/types/catalog';
import { AppCard } from '@/components/ui/AppCard';
import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { AppSelect } from '@/components/ui/AppSelect';
import { AppUpload } from '@/components/ui/AppUpload';
import styles from './WorkForm.module.css';

const { Text } = Typography;
const { Option } = AppSelect;

const ALLOWED_FILE_EXTENSIONS = [
  'doc', 'docx', 'pdf', 'rtf', 'txt',
  'ppt', 'pptx',
  'xls', 'xlsx', 'csv',
  'dwg', 'dxf', 'cdr', 'cdw', 'bak',
  'jpg', 'jpeg', 'png', 'bmp', 'svg',
];

const WorkForm: React.FC<WorkFormProps> = ({ onSave, onCancel }) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<WorkFormData>({
    title: '',
    description: '',
    price: 0,
    subject: '',
    workType: '',
    preview: null,
    files: [],
  });
  const [newWorkTypeModalVisible, setNewWorkTypeModalVisible] = useState(false);
  const [newSubjectModalVisible, setNewSubjectModalVisible] = useState(false);
  const [newWorkTypeName, setNewWorkTypeName] = useState('');
  const [newSubjectName, setNewSubjectName] = useState('');

  
  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ['subjects'],
    queryFn: () => catalogApi.getSubjects(),
  });

  const { data: workTypes = [] } = useQuery<WorkType[]>({
    queryKey: ['workTypes'],
    queryFn: () => catalogApi.getWorkTypes(),
  });

  
  const createWorkTypeMutation = useMutation({
    mutationFn: (name: string) => catalogApi.createWorkType(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workTypes'] });
      setNewWorkTypeModalVisible(false);
      setNewWorkTypeName('');
      message.success('Новый тип работы добавлен');
    },
    onError: () => {
      message.error('Ошибка при добавлении типа работы');
    },
  });

  const createSubjectMutation = useMutation({
    mutationFn: (name: string) => catalogApi.createSubject(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      setNewSubjectModalVisible(false);
      setNewSubjectName('');
      message.success('Новый предмет добавлен');
    },
    onError: () => {
      message.error('Ошибка при добавлении предмета');
    },
  });

  const handleSubmit = () => {
    if (!formData.title || !formData.price || !formData.workType || !formData.subject) {
      message.error('Заполните все обязательные поля');
      return;
    }
    onSave(formData);
  };

  const filterSelectByLabel = (input: string, option: { children?: unknown } | undefined) =>
    String(option?.children ?? '').toLowerCase().includes(input.toLowerCase());

  return (
    <AppCard className={styles.card} variant="gradient">
      <Space direction="vertical" className={styles.spaceFullWidth} size="large">
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Text className={styles.label}>
              Название работы
            </Text>
            <AppInput
              placeholder="Введите название работы"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className={styles.input}
            />
          </Col>
          <Col xs={24} sm={12}>
            <Text className={styles.label}>
              Стоимость работы
            </Text>
            <AppInput.Number
              placeholder="Введите стоимость работы"
              value={formData.price}
              onChange={(value) => setFormData({ ...formData, price: Number(value) || 0 })}
              className={styles.priceInput}
              min={0}
              addonAfter="₽"
              size="middle"
            />
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Text className={styles.label}>
              Тип работы
            </Text>
            <AppSelect
              placeholder="Выберите тип работы"
              value={formData.workType}
              onChange={(value) => setFormData({ ...formData, workType: value })}
              className={styles.select}
              showSearch
              filterOption={filterSelectByLabel}
              popupRender={(menu) => (
                <>
                  {menu}
                  <div className={styles.selectDropdownFooter}>
                    <AppButton
                      variant="text"
                      icon={<PlusOutlined />}
                      onClick={() => setNewWorkTypeModalVisible(true)}
                      className={styles.selectDropdownButton}
                    >
                      Добавить новый тип работы
                    </AppButton>
                  </div>
                </>
              )}
            >
              {workTypes.map((type: WorkType) => (
                <Option key={type.id} value={type.id}>
                  {type.name}
                </Option>
              ))}
            </AppSelect>
          </Col>
          <Col xs={24} sm={12}>
            <Text className={styles.label}>
              Предмет
            </Text>
            <AppSelect
              placeholder="Выберите предмет"
              value={formData.subject}
              onChange={(value) => setFormData({ ...formData, subject: value })}
              className={styles.select}
              showSearch
              filterOption={filterSelectByLabel}
              popupRender={(menu) => (
                <>
                  {menu}
                  <div className={styles.selectDropdownFooter}>
                    <AppButton
                      variant="text"
                      icon={<PlusOutlined />}
                      onClick={() => setNewSubjectModalVisible(true)}
                      className={styles.selectDropdownButton}
                    >
                      Добавить новый предмет
                    </AppButton>
                  </div>
                </>
              )}
            >
              {subjects.map((subject: Subject) => (
                <Option key={subject.id} value={subject.id}>
                  {subject.name}
                </Option>
              ))}
            </AppSelect>
          </Col>
        </Row>

        <div>
          <Text className={styles.label}>
            Подробное описание
          </Text>
          <RichTextEditor
            value={formData.description}
            onChange={(value) => setFormData({ ...formData, description: value })}
            placeholder="Подробное описание вашей работы"
          />
        </div>

        <div>
          <Text className={styles.label}>
            Обложка работы (изображение)
          </Text>
          <AppUpload.Dragger
            name="preview"
            listType="picture-card"
            className={styles.uploadArea}
            showUploadList={false}
            beforeUpload={(file) => {
              const isImage = file.type.startsWith('image/');
              if (!isImage) {
                message.error('Можно загружать только изображения!');
                return AppUpload.LIST_IGNORE;
              }
              
              const isLt5M = file.size < 5 * 1024 * 1024;
              if (!isLt5M) {
                message.error('Максимальный размер изображения: 5 МБ');
                return AppUpload.LIST_IGNORE;
              }
              
              setFormData({ ...formData, preview: file });
              return false;
            }}
          >
            {formData.preview ? (
              <img
                src={URL.createObjectURL(formData.preview)} 
                alt="preview" 
                className={styles.previewImage}
              />
            ) : (
              <div>
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <div className={styles.previewHint}>Нажмите или перетащите изображение</div>
              </div>
            )}
          </AppUpload.Dragger>
          {formData.preview && (
            <AppButton 
              variant="text" 
              onClick={() => setFormData({ ...formData, preview: null })}
              className={styles.removePreviewButton}
            >
              Удалить изображение
            </AppButton>
          )}
        </div>

        <div>
          <Text className={styles.label}>
            Файлы работы (необязательно)
          </Text>
          <AppUpload.Dragger
            name="files"
            multiple
            className={styles.uploadArea}
            fileList={formData.files?.map((file, index) => ({
              uid: `${index}`,
              name: file.name,
              status: 'done' as const,
              size: file.size,
            })) || []}
            beforeUpload={(file) => {
              const isLt10M = file.size < 10 * 1024 * 1024;
              if (!isLt10M) {
                message.error('Максимальный размер файла: 10 МБ');
                return AppUpload.LIST_IGNORE;
              }
              
              const ext = file.name.split('.').pop()?.toLowerCase() || '';
              if (!ALLOWED_FILE_EXTENSIONS.includes(ext)) {
                message.error('Неподдерживаемый формат файла');
                return AppUpload.LIST_IGNORE;
              }
              
              setFormData({ 
                ...formData, 
                files: [...(formData.files || []), file] 
              });
              return false;
            }}
            onRemove={(file) => {
              const index = parseInt(file.uid);
              const newFiles = [...(formData.files || [])];
              newFiles.splice(index, 1);
              setFormData({
                ...formData,
                files: newFiles,
              });
            }}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">Нажмите или перетащите файлы сюда</p>
            <p className="ant-upload-hint">
              Допустимые форматы: .doc, .docx, .pdf, .rtf, .txt, .ppt, .pptx, .xls, .xlsx, .csv, .dwg, .dxf, .cdr, .cdw, .bak, .jpg, .jpeg, .png, .bmp, .svg
            </p>
          </AppUpload.Dragger>
          {formData.files && formData.files.length > 0 && (
            <div className={styles.uploadedFilesInfo}>
              <Text type="secondary">Загружено файлов: {formData.files.length}</Text>
            </div>
          )}
        </div>

        
        <div className={styles.actions}>
          <AppButton onClick={onCancel} className={styles.cancelButton} variant="secondary">
            Отмена
          </AppButton>
          <AppButton onClick={handleSubmit} className={styles.saveButton} variant="primary">
            Сохранить
          </AppButton>
        </div>
      </Space>

      
      <Modal
        title="Добавить новый тип работы"
        open={newWorkTypeModalVisible}
        onOk={() => {
          if (newWorkTypeName.trim()) {
            createWorkTypeMutation.mutate(newWorkTypeName.trim());
          } else {
            message.error('Введите название типа работы');
          }
        }}
        onCancel={() => {
          setNewWorkTypeModalVisible(false);
          setNewWorkTypeName('');
        }}
        confirmLoading={createWorkTypeMutation.isPending}
      >
        <AppInput
          placeholder="Название типа работы"
          value={newWorkTypeName}
          onChange={(e) => setNewWorkTypeName(e.target.value)}
          onPressEnter={() => {
            if (newWorkTypeName.trim()) {
              createWorkTypeMutation.mutate(newWorkTypeName.trim());
            }
          }}
        />
      </Modal>

      
      <Modal
        title="Добавить новый предмет"
        open={newSubjectModalVisible}
        onOk={() => {
          if (newSubjectName.trim()) {
            createSubjectMutation.mutate(newSubjectName.trim());
          } else {
            message.error('Введите название предмета');
          }
        }}
        onCancel={() => {
          setNewSubjectModalVisible(false);
          setNewSubjectName('');
        }}
        confirmLoading={createSubjectMutation.isPending}
      >
        <AppInput
          placeholder="Название предмета"
          value={newSubjectName}
          onChange={(e) => setNewSubjectName(e.target.value)}
          onPressEnter={() => {
            if (newSubjectName.trim()) {
              createSubjectMutation.mutate(newSubjectName.trim());
            }
          }}
        />
      </Modal>
    </AppCard>
  );
};

export default WorkForm;
