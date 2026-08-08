import React, { useState } from 'react';
import { InboxOutlined, PlusOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Col, Modal, Row, Space, Typography, message } from 'antd';

import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppInput } from '@/components/ui/AppInput';
import { AppSelect } from '@/components/ui/AppSelect';
import { AppUpload } from '@/components/ui/AppUpload';
import { AddNewItemModal } from '@/components/ui/AddNewItemModal';
import { ALLOWED_FILE_EXTENSIONS } from '@/constants/files';
import { catalogApi } from '@/features/common/api/catalog';
import { Subject, WorkType } from '@/features/common/types/catalog';
import { RichTextEditor } from '@/features/common';
import { WorkFormData, WorkFormProps } from '@/features/shop/types';
import { useSortedSubjects, useSortedWorkTypes } from '@/hooks';
import styles from './WorkForm.module.css';

const { Text } = Typography;
const { Option } = AppSelect;

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

  const { data: subjects = [] } = useSortedSubjects();
  const { data: workTypes = [] } = useSortedWorkTypes();

  const createWorkTypeMutation = useMutation({
    mutationFn: (name: string) => catalogApi.createWorkType(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workTypes'] });
      setNewWorkTypeModalVisible(false);
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
      message.success('Новый предмет добавлен');
    },
    onError: () => {
      message.error('Ошибка при добавлении предмета');
    },
  });

  const handleSubmit = () => {
    const plainDescription = (formData.description || '')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim();

    if (!formData.title || !formData.price || !formData.workType || !formData.subject) {
      message.error('Заполните все обязательные поля');
      return;
    }

    if (!plainDescription) {
      message.error('Добавьте описание работы');
      return;
    }

    if (!formData.files || formData.files.length === 0) {
      message.error('Прикрепите хотя бы один файл работы');
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
            <Text className={`${styles.label} ${styles.labelRequired}`}>Название работы</Text>
            <AppInput
              placeholder="Введите название работы"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className={styles.input}
            />
          </Col>
          <Col xs={24} sm={12}>
            <Text className={`${styles.label} ${styles.labelRequired}`}>Стоимость работы</Text>
            <div className={styles.priceInputWrap}>
              <AppInput.Number
                placeholder="Введите стоимость работы"
                value={formData.price}
                onChange={(value) => setFormData({ ...formData, price: Number(value) || 0 })}
                className={styles.priceInput}
                min={0}
                size="middle"
              />
              <span className={styles.priceSuffix}>₽</span>
            </div>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Text className={`${styles.label} ${styles.labelRequired}`}>Тип работы</Text>
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
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Text className={`${styles.label} ${styles.labelRequired}`}>Предмет</Text>
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
          <Text className={`${styles.label} ${styles.labelRequired}`}>Подробное описание</Text>
          <RichTextEditor
            value={formData.description}
            onChange={(value) => setFormData({ ...formData, description: value })}
            placeholder="Подробное описание вашей работы"
          />
        </div>

        <div>
          <Text className={styles.label}>Обложка работы (изображение)</Text>
          <AppUpload.Dragger
            name="preview"
            listType="picture-card"
            className={styles.uploadArea}
            showUploadList={false}
            beforeUpload={(file) => {
              const isImage = file.type.startsWith('image/');
              if (!isImage) {
                message.error('Можно загружать только изображения');
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
          <Text className={styles.label}>Файлы работы</Text>
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
              const isLt50M = file.size < 50 * 1024 * 1024;
              if (!isLt50M) {
                message.error('Максимальный размер файла: 50 МБ');
                return AppUpload.LIST_IGNORE;
              }

              const ext = file.name.split('.').pop()?.toLowerCase() || '';
              if (!ALLOWED_FILE_EXTENSIONS.includes(ext)) {
                message.error('Неподдерживаемый формат файла');
                return AppUpload.LIST_IGNORE;
              }

              setFormData({
                ...formData,
                files: [...(formData.files || []), file],
              });
              return false;
            }}
            onRemove={(file) => {
              const index = parseInt(file.uid, 10);
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

      <AddNewItemModal
        title="Добавить новый тип работы"
        placeholder="Название типа работы"
        emptyMessage="Введите название типа работы"
        open={newWorkTypeModalVisible}
        onOk={(name) => createWorkTypeMutation.mutate(name)}
        onCancel={() => setNewWorkTypeModalVisible(false)}
        confirmLoading={createWorkTypeMutation.isPending}
      />

      <AddNewItemModal
        title="Добавить новый предмет"
        placeholder="Название предмета"
        emptyMessage="Введите название предмета"
        open={newSubjectModalVisible}
        onOk={(name) => createSubjectMutation.mutate(name)}
        onCancel={() => setNewSubjectModalVisible(false)}
        confirmLoading={createSubjectMutation.isPending}
      />
    </AppCard>
  );
};

export default WorkForm;
