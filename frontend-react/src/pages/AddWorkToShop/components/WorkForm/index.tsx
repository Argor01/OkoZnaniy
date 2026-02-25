import React, { useState } from 'react';
import { Card, Space, Row, Col, Input, InputNumber, Select, Typography, Button, Upload, message, Modal } from 'antd';
import { InboxOutlined, PlusOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { catalogApi } from '../../../../api/catalog';
import { RichTextEditor } from '../../../../components/editor';
import { WorkFormProps, WorkFormData } from '../../types';
import styles from './WorkForm.module.css';

const { Text } = Typography;
const { Option } = Select;

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

  
  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => catalogApi.getSubjects(),
  });

  const { data: workTypes = [] } = useQuery({
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
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.name?.[0] || 
                          error?.response?.data?.detail || 
                          'Ошибка при добавлении типа работы';
      message.error(errorMessage);
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
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.name?.[0] || 
                          error?.response?.data?.detail || 
                          'Ошибка при добавлении предмета';
      message.error(errorMessage);
    },
  });

  const handleSubmit = () => {
    if (!formData.title || !formData.price || !formData.workType || !formData.subject) {
      message.error('Заполните все обязательные поля');
      return;
    }
    onSave(formData);
  };

  const filterSelectByLabel = (input: string, option: any) =>
    String(option?.children ?? '').toLowerCase().includes(input.toLowerCase());

  return (
    <Card className={styles.card}>
      <Space direction="vertical" className={styles.spaceFullWidth} size="large">
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Text strong className={styles.label}>
              Название работы
            </Text>
            <Input
              placeholder="Введите название работы"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className={styles.input}
            />
          </Col>
          <Col xs={24} sm={12}>
            <Text strong className={styles.label}>
              Стоимость работы
            </Text>
            <Input
              placeholder="Введите стоимость работы"
              value={formData.price || ''}
              onChange={(e) => {
                const value = e.target.value;
                // Разрешаем только цифры
                if (value === '' || /^\d+$/.test(value)) {
                  setFormData({ ...formData, price: value === '' ? 0 : parseInt(value, 10) });
                }
              }}
              onKeyPress={(e) => {
                // Блокируем ввод нецифровых символов
                if (!/[0-9]/.test(e.key)) {
                  e.preventDefault();
                }
              }}
              className={styles.priceInput}
              suffix="₽"
            />
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Text strong className={styles.label}>
              Тип работы
            </Text>
            <Select
              placeholder="Выберите тип работы"
              value={formData.workType}
              onChange={(value) => setFormData({ ...formData, workType: value })}
              className={styles.select}
              showSearch
              filterOption={filterSelectByLabel}
              dropdownRender={(menu) => (
                <>
                  {menu}
                  <div className={styles.selectDropdownFooter}>
                    <Button
                      type="text"
                      icon={<PlusOutlined />}
                      onClick={() => setNewWorkTypeModalVisible(true)}
                      className={styles.selectDropdownButton}
                    >
                      Добавить новый тип работы
                    </Button>
                  </div>
                </>
              )}
            >
              {workTypes.map((type: any) => (
                <Option key={type.id} value={type.id}>
                  {type.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12}>
            <Text strong className={styles.label}>
              Предмет
            </Text>
            <Select
              placeholder="Выберите предмет"
              value={formData.subject}
              onChange={(value) => setFormData({ ...formData, subject: value })}
              className={styles.select}
              showSearch
              filterOption={filterSelectByLabel}
              dropdownRender={(menu) => (
                <>
                  {menu}
                  <div className={styles.selectDropdownFooter}>
                    <Button
                      type="text"
                      icon={<PlusOutlined />}
                      onClick={() => setNewSubjectModalVisible(true)}
                      className={styles.selectDropdownButton}
                    >
                      Добавить новый предмет
                    </Button>
                  </div>
                </>
              )}
            >
              {subjects.map((subject: any) => (
                <Option key={subject.id} value={subject.id}>
                  {subject.name}
                </Option>
              ))}
            </Select>
          </Col>
        </Row>

        <div>
          <Text strong className={styles.label}>
            Подробное описание
          </Text>
          <RichTextEditor
            value={formData.description}
            onChange={(value) => setFormData({ ...formData, description: value })}
            placeholder="Подробное описание вашей работы"
          />
        </div>

        <div>
          <Text strong className={styles.label}>
            Превью работы (изображение)
          </Text>
          <Text type="secondary" className={styles.hint}>
            Рекомендуемый размер: 800x600 пикселей. Форматы: JPG, PNG, WEBP. Максимальный размер: 5 МБ
          </Text>
          <Upload
            name="preview"
            listType="picture-card"
            className={styles.previewUpload}
            showUploadList={false}
            accept="image/jpeg,image/jpg,image/png,image/webp"
            beforeUpload={(file) => {
              const isImage = file.type.startsWith('image/');
              if (!isImage) {
                message.error('Можно загружать только изображения!');
                return Upload.LIST_IGNORE as any;
              }
              
              const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
              if (!allowedTypes.includes(file.type)) {
                message.error('Допустимые форматы: JPG, PNG, WEBP');
                return Upload.LIST_IGNORE as any;
              }
              
              const isLt5M = file.size < 5 * 1024 * 1024;
              if (!isLt5M) {
                message.error('Максимальный размер изображения: 5 МБ');
                return Upload.LIST_IGNORE as any;
              }
              
              setFormData({ ...formData, preview: file });
              message.success('Изображение загружено');
              return false;
            }}
          >
            {formData.preview ? (
              <div className={styles.previewImageContainer}>
                <img
                  src={URL.createObjectURL(formData.preview)} 
                  alt="preview" 
                  className={styles.previewImage}
                />
                <div className={styles.previewOverlay}>
                  <PlusOutlined />
                  <div className={styles.previewHint}>Изменить</div>
                </div>
              </div>
            ) : (
              <div className={styles.previewPlaceholder}>
                <PlusOutlined className={styles.previewIcon} />
                <div className={styles.previewHint}>Нажмите для загрузки</div>
                <div className={styles.previewSubHint}>или перетащите файл сюда</div>
              </div>
            )}
          </Upload>
          {formData.preview && (
            <div className={styles.previewActions}>
              <Text type="secondary" className={styles.previewFileName}>
                {formData.preview.name}
              </Text>
              <Button 
                type="link" 
                danger
                onClick={() => setFormData({ ...formData, preview: null })}
                className={styles.removePreviewButton}
              >
                Удалить изображение
              </Button>
            </div>
          )}
        </div>

        <div>
          <Text strong className={styles.label}>
            Файлы работы (необязательно)
          </Text>
          <Upload.Dragger
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
                return Upload.LIST_IGNORE as any;
              }
              
              const ext = file.name.split('.').pop()?.toLowerCase() || '';
              if (!ALLOWED_FILE_EXTENSIONS.includes(ext)) {
                message.error('Неподдерживаемый формат файла');
                return Upload.LIST_IGNORE as any;
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
          </Upload.Dragger>
          {formData.files && formData.files.length > 0 && (
            <div className={styles.uploadedFilesInfo}>
              <Text type="secondary">Загружено файлов: {formData.files.length}</Text>
            </div>
          )}
        </div>

        
        <div className={styles.actions}>
          <Button onClick={onCancel} className={styles.cancelButton}>
            Отмена
          </Button>
          <Button type="primary" onClick={handleSubmit} className={styles.saveButton}>
            Сохранить
          </Button>
        </div>
      </Space>

      
      <Modal
        title="Добавить новый тип работы"
        open={newWorkTypeModalVisible}
        onOk={() => {
          if (newWorkTypeName.trim()) {
            // Нормализуем имя
            const normalizedName = newWorkTypeName.trim().split(/\s+/).join(' ').toLowerCase();
            
            // Проверяем, нет ли уже такого типа работы
            const existingWorkType = workTypes.find((wt: any) => 
              wt.name.toLowerCase() === normalizedName
            );
            
            if (existingWorkType) {
              message.warning(`Тип работы "${existingWorkType.name}" уже существует`);
              return;
            }
            
            // Делаем первую букву заглавной
            const capitalizedName = newWorkTypeName.trim().split(/\s+/).join(' ')
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
              .join(' ');
            
            createWorkTypeMutation.mutate(capitalizedName);
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
        <Input
          placeholder="Название типа работы"
          value={newWorkTypeName}
          onChange={(e) => setNewWorkTypeName(e.target.value)}
          onPressEnter={() => {
            if (newWorkTypeName.trim()) {
              const normalizedName = newWorkTypeName.trim().split(/\s+/).join(' ').toLowerCase();
              const existingWorkType = workTypes.find((wt: any) => 
                wt.name.toLowerCase() === normalizedName
              );
              if (existingWorkType) {
                message.warning(`Тип работы "${existingWorkType.name}" уже существует`);
                return;
              }
              const capitalizedName = newWorkTypeName.trim().split(/\s+/).join(' ')
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');
              createWorkTypeMutation.mutate(capitalizedName);
            }
          }}
        />
      </Modal>

      
      <Modal
        title="Добавить новый предмет"
        open={newSubjectModalVisible}
        onOk={() => {
          if (newSubjectName.trim()) {
            // Нормализуем имя
            const normalizedName = newSubjectName.trim().split(/\s+/).join(' ').toLowerCase();
            
            // Проверяем, нет ли уже такого предмета
            const existingSubject = subjects.find((s: any) => 
              s.name.toLowerCase() === normalizedName
            );
            
            if (existingSubject) {
              message.warning(`Предмет "${existingSubject.name}" уже существует`);
              return;
            }
            
            // Делаем первую букву заглавной
            const capitalizedName = newSubjectName.trim().split(/\s+/).join(' ')
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
              .join(' ');
            
            createSubjectMutation.mutate(capitalizedName);
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
        <Input
          placeholder="Название предмета"
          value={newSubjectName}
          onChange={(e) => setNewSubjectName(e.target.value)}
          onPressEnter={() => {
            if (newSubjectName.trim()) {
              const normalizedName = newSubjectName.trim().split(/\s+/).join(' ').toLowerCase();
              const existingSubject = subjects.find((s: any) => 
                s.name.toLowerCase() === normalizedName
              );
              if (existingSubject) {
                message.warning(`Предмет "${existingSubject.name}" уже существует`);
                return;
              }
              const capitalizedName = newSubjectName.trim().split(/\s+/).join(' ')
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');
              createSubjectMutation.mutate(capitalizedName);
            }
          }}
        />
      </Modal>
    </Card>
  );
};

export default WorkForm;
