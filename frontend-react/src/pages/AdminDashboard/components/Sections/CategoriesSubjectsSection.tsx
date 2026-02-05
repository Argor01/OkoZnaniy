import React, { useState } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Tag, 
  Space, 
  Typography, 
  Input,
  Modal,
  message,
  Tooltip,
  Tabs,
  Form,
  Select,
  InputNumber,
  Switch,
  Popconfirm
} from 'antd';
import { 
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined
} from '@ant-design/icons';

const { Text, Title } = Typography;
const { Search } = Input;
const { Option } = Select;
const { TabPane } = Tabs;

interface Subject {
  id: number;
  name: string;
  description: string;
  category_id: number;
  category_name: string;
  is_active: boolean;
  order_index: number;
  works_count: number;
  orders_count: number;
  created_at: string;
  updated_at: string;
}

interface Category {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  order_index: number;
  subjects_count: number;
  works_count: number;
  icon?: string;
  color?: string;
  created_at: string;
  updated_at: string;
}

interface WorkType {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  order_index: number;
  min_price: number;
  max_price: number;
  avg_completion_days: number;
  works_count: number;
  orders_count: number;
  created_at: string;
  updated_at: string;
}

interface CategoriesSubjectsSectionProps {
  subjects?: Subject[];
  categories?: Category[];
  workTypes?: WorkType[];
  loading?: boolean;
  onCreateSubject?: (subjectData: Partial<Subject>) => void;
  onUpdateSubject?: (subjectId: number, subjectData: Partial<Subject>) => void;
  onDeleteSubject?: (subjectId: number) => void;
  onCreateCategory?: (categoryData: Partial<Category>) => void;
  onUpdateCategory?: (categoryId: number, categoryData: Partial<Category>) => void;
  onDeleteCategory?: (categoryId: number) => void;
  onCreateWorkType?: (workTypeData: Partial<WorkType>) => void;
  onUpdateWorkType?: (workTypeId: number, workTypeData: Partial<WorkType>) => void;
  onDeleteWorkType?: (workTypeId: number) => void;
}

export const CategoriesSubjectsSection: React.FC<CategoriesSubjectsSectionProps> = ({
  subjects = [],
  categories = [],
  workTypes = [],
  loading = false,
  onCreateSubject,
  onUpdateSubject,
  onDeleteSubject,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  onCreateWorkType,
  onUpdateWorkType,
  onDeleteWorkType,
}) => {
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedWorkType, setSelectedWorkType] = useState<WorkType | null>(null);
  
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [subjectModalVisible, setSubjectModalVisible] = useState(false);
  const [workTypeModalVisible, setWorkTypeModalVisible] = useState(false);
  
  const [categoryForm] = Form.useForm();
  const [subjectForm] = Form.useForm();
  const [workTypeForm] = Form.useForm();
  
  const [editMode, setEditMode] = useState(false);

  // Мок данные для демонстрации
  const mockCategories: Category[] = [
    {
      id: 1,
      name: 'Точные науки',
      description: 'Математика, физика, химия и другие точные науки',
      is_active: true,
      order_index: 1,
      subjects_count: 5,
      works_count: 150,
      icon: '🔬',
      color: '#1890ff',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 2,
      name: 'Гуманитарные науки',
      description: 'История, литература, философия и другие гуманитарные дисциплины',
      is_active: true,
      order_index: 2,
      subjects_count: 8,
      works_count: 200,
      icon: '📚',
      color: '#52c41a',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 3,
      name: 'Технические науки',
      description: 'Программирование, инженерия, архитектура',
      is_active: true,
      order_index: 3,
      subjects_count: 6,
      works_count: 120,
      icon: '⚙️',
      color: '#faad14',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ];

  const mockSubjects: Subject[] = [
    {
      id: 1,
      name: 'Математика',
      description: 'Высшая математика, алгебра, геометрия, математический анализ',
      category_id: 1,
      category_name: 'Точные науки',
      is_active: true,
      order_index: 1,
      works_count: 85,
      orders_count: 120,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 2,
      name: 'Физика',
      description: 'Механика, термодинамика, электродинамика, квантовая физика',
      category_id: 1,
      category_name: 'Точные науки',
      is_active: true,
      order_index: 2,
      works_count: 45,
      orders_count: 80,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 3,
      name: 'История',
      description: 'История России, всемирная история, историография',
      category_id: 2,
      category_name: 'Гуманитарные науки',
      is_active: true,
      order_index: 1,
      works_count: 95,
      orders_count: 150,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 4,
      name: 'Программирование',
      description: 'Веб-разработка, мобильная разработка, алгоритмы',
      category_id: 3,
      category_name: 'Технические науки',
      is_active: true,
      order_index: 1,
      works_count: 75,
      orders_count: 100,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ];

  const mockWorkTypes: WorkType[] = [
    {
      id: 1,
      name: 'Курсовая работа',
      description: 'Курсовая работа по предмету',
      is_active: true,
      order_index: 1,
      min_price: 2000,
      max_price: 8000,
      avg_completion_days: 7,
      works_count: 150,
      orders_count: 200,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 2,
      name: 'Дипломная работа',
      description: 'Выпускная квалификационная работа',
      is_active: true,
      order_index: 2,
      min_price: 8000,
      max_price: 25000,
      avg_completion_days: 21,
      works_count: 80,
      orders_count: 100,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 3,
      name: 'Реферат',
      description: 'Реферат по теме',
      is_active: true,
      order_index: 3,
      min_price: 500,
      max_price: 2000,
      avg_completion_days: 3,
      works_count: 200,
      orders_count: 300,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 4,
      name: 'Контрольная работа',
      description: 'Контрольная работа по предмету',
      is_active: true,
      order_index: 4,
      min_price: 300,
      max_price: 1500,
      avg_completion_days: 2,
      works_count: 120,
      orders_count: 180,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ];

  const categoriesData = categories.length > 0 ? categories : mockCategories;
  const subjectsData = subjects.length > 0 ? subjects : mockSubjects;
  const workTypesData = workTypes.length > 0 ? workTypes : mockWorkTypes;

  // Обработчики для категорий
  const handleCreateCategory = () => {
    setSelectedCategory(null);
    setEditMode(false);
    categoryForm.resetFields();
    setCategoryModalVisible(true);
  };

  const handleEditCategory = (category: Category) => {
    setSelectedCategory(category);
    setEditMode(true);
    categoryForm.setFieldsValue(category);
    setCategoryModalVisible(true);
  };

  const handleCategorySubmit = async () => {
    try {
      const values = await categoryForm.validateFields();
      if (editMode && selectedCategory) {
        onUpdateCategory?.(selectedCategory.id, values);
        message.success(`Категория "${values.name}" обновлена`);
      } else {
        onCreateCategory?.(values);
        message.success(`Категория "${values.name}" создана`);
      }
      setCategoryModalVisible(false);
      categoryForm.resetFields();
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleDeleteCategory = (category: Category) => {
    onDeleteCategory?.(category.id);
    message.success(`Категория "${category.name}" удалена`);
  };

  // Обработчики для предметов
  const handleCreateSubject = () => {
    setSelectedSubject(null);
    setEditMode(false);
    subjectForm.resetFields();
    setSubjectModalVisible(true);
  };

  const handleEditSubject = (subject: Subject) => {
    setSelectedSubject(subject);
    setEditMode(true);
    subjectForm.setFieldsValue(subject);
    setSubjectModalVisible(true);
  };

  const handleSubjectSubmit = async () => {
    try {
      const values = await subjectForm.validateFields();
      if (editMode && selectedSubject) {
        onUpdateSubject?.(selectedSubject.id, values);
        message.success(`Предмет "${values.name}" обновлен`);
      } else {
        onCreateSubject?.(values);
        message.success(`Предмет "${values.name}" создан`);
      }
      setSubjectModalVisible(false);
      subjectForm.resetFields();
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleDeleteSubject = (subject: Subject) => {
    onDeleteSubject?.(subject.id);
    message.success(`Предмет "${subject.name}" удален`);
  };

  // Обработчики для типов работ
  const handleCreateWorkType = () => {
    setSelectedWorkType(null);
    setEditMode(false);
    workTypeForm.resetFields();
    setWorkTypeModalVisible(true);
  };

  const handleEditWorkType = (workType: WorkType) => {
    setSelectedWorkType(workType);
    setEditMode(true);
    workTypeForm.setFieldsValue(workType);
    setWorkTypeModalVisible(true);
  };

  const handleWorkTypeSubmit = async () => {
    try {
      const values = await workTypeForm.validateFields();
      if (editMode && selectedWorkType) {
        onUpdateWorkType?.(selectedWorkType.id, values);
        message.success(`Тип работы "${values.name}" обновлен`);
      } else {
        onCreateWorkType?.(values);
        message.success(`Тип работы "${values.name}" создан`);
      }
      setWorkTypeModalVisible(false);
      workTypeForm.resetFields();
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleDeleteWorkType = (workType: WorkType) => {
    onDeleteWorkType?.(workType.id);
    message.success(`Тип работы "${workType.name}" удален`);
  };

  // Колонки для таблиц
  const categoryColumns = [
    {
      title: 'Категория',
      key: 'category',
      render: (record: Category) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '18px' }}>{record.icon}</span>
          <div>
            <div style={{ fontWeight: 500 }}>{record.name}</div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.description}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Статус',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Активна' : 'Неактивна'}
        </Tag>
      ),
    },
    {
      title: 'Предметов',
      dataIndex: 'subjects_count',
      key: 'subjects_count',
      width: 100,
      render: (count: number) => <Tag color="blue">{count}</Tag>,
    },
    {
      title: 'Работ',
      dataIndex: 'works_count',
      key: 'works_count',
      width: 100,
      render: (count: number) => <Tag color="green">{count}</Tag>,
    },
    {
      title: 'Порядок',
      dataIndex: 'order_index',
      key: 'order_index',
      width: 80,
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 120,
      render: (record: Category) => (
        <Space>
          <Tooltip title="Редактировать">
            <Button 
              size="small" 
              icon={<EditOutlined />}
              onClick={() => handleEditCategory(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Удалить категорию?"
            description="Это действие нельзя отменить"
            onConfirm={() => handleDeleteCategory(record)}
            okText="Удалить"
            cancelText="Отмена"
          >
            <Tooltip title="Удалить">
              <Button 
                size="small" 
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const subjectColumns = [
    {
      title: 'Предмет',
      key: 'subject',
      render: (record: Subject) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.name}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.description}
          </Text>
          <br />
          <Tag color="blue">{record.category_name}</Tag>
        </div>
      ),
    },
    {
      title: 'Статус',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Активен' : 'Неактивен'}
        </Tag>
      ),
    },
    {
      title: 'Работ',
      dataIndex: 'works_count',
      key: 'works_count',
      width: 80,
      render: (count: number) => <Tag color="green">{count}</Tag>,
    },
    {
      title: 'Заказов',
      dataIndex: 'orders_count',
      key: 'orders_count',
      width: 80,
      render: (count: number) => <Tag color="orange">{count}</Tag>,
    },
    {
      title: 'Порядок',
      dataIndex: 'order_index',
      key: 'order_index',
      width: 80,
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 120,
      render: (record: Subject) => (
        <Space>
          <Tooltip title="Редактировать">
            <Button 
              size="small" 
              icon={<EditOutlined />}
              onClick={() => handleEditSubject(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Удалить предмет?"
            description="Это действие нельзя отменить"
            onConfirm={() => handleDeleteSubject(record)}
            okText="Удалить"
            cancelText="Отмена"
          >
            <Tooltip title="Удалить">
              <Button 
                size="small" 
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const workTypeColumns = [
    {
      title: 'Тип работы',
      key: 'workType',
      render: (record: WorkType) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.name}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.description}
          </Text>
        </div>
      ),
    },
    {
      title: 'Статус',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Активен' : 'Неактивен'}
        </Tag>
      ),
    },
    {
      title: 'Цена',
      key: 'price',
      width: 150,
      render: (record: WorkType) => (
        <div style={{ fontSize: '12px' }}>
          <div>От {record.min_price.toLocaleString()} ₽</div>
          <div>До {record.max_price.toLocaleString()} ₽</div>
        </div>
      ),
    },
    {
      title: 'Срок',
      dataIndex: 'avg_completion_days',
      key: 'avg_completion_days',
      width: 80,
      render: (days: number) => `${days} дн.`,
    },
    {
      title: 'Работ',
      dataIndex: 'works_count',
      key: 'works_count',
      width: 80,
      render: (count: number) => <Tag color="green">{count}</Tag>,
    },
    {
      title: 'Заказов',
      dataIndex: 'orders_count',
      key: 'orders_count',
      width: 80,
      render: (count: number) => <Tag color="orange">{count}</Tag>,
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 120,
      render: (record: WorkType) => (
        <Space>
          <Tooltip title="Редактировать">
            <Button 
              size="small" 
              icon={<EditOutlined />}
              onClick={() => handleEditWorkType(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Удалить тип работы?"
            description="Это действие нельзя отменить"
            onConfirm={() => handleDeleteWorkType(record)}
            okText="Удалить"
            cancelText="Отмена"
          >
            <Tooltip title="Удалить">
              <Button 
                size="small" 
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Title level={4}>Категории и предметы</Title>
          <Text type="secondary">
            Управление категориями, предметами и типами работ
          </Text>
        </div>

        <Tabs defaultActiveKey="categories">
          <TabPane tab="Категории" key="categories">
            <div style={{ marginBottom: 16 }}>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={handleCreateCategory}
              >
                Добавить категорию
              </Button>
            </div>

            <Table
              columns={categoryColumns}
              dataSource={categoriesData}
              rowKey="id"
              loading={loading}
              pagination={false}
              locale={{ emptyText: 'Категории не найдены' }}
              size="small"
            />
          </TabPane>

          <TabPane tab="Предметы" key="subjects">
            <div style={{ marginBottom: 16, display: 'flex', gap: 16 }}>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={handleCreateSubject}
              >
                Добавить предмет
              </Button>
              
              <Search
                placeholder="Поиск предметов"
                allowClear
                style={{ width: 250 }}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                prefix={<SearchOutlined />}
              />
            </div>

            <Table
              columns={subjectColumns}
              dataSource={subjectsData.filter(s => 
                s.name.toLowerCase().includes(searchText.toLowerCase()) ||
                s.description.toLowerCase().includes(searchText.toLowerCase())
              )}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10 }}
              locale={{ emptyText: 'Предметы не найдены' }}
              size="small"
            />
          </TabPane>

          <TabPane tab="Типы работ" key="workTypes">
            <div style={{ marginBottom: 16 }}>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={handleCreateWorkType}
              >
                Добавить тип работы
              </Button>
            </div>

            <Table
              columns={workTypeColumns}
              dataSource={workTypesData}
              rowKey="id"
              loading={loading}
              pagination={false}
              locale={{ emptyText: 'Типы работ не найдены' }}
              size="small"
            />
          </TabPane>
        </Tabs>
      </Card> 
     {/* Модальное окно категории */}
      <Modal
        title={editMode ? 'Редактировать категорию' : 'Создать категорию'}
        open={categoryModalVisible}
        onOk={handleCategorySubmit}
        onCancel={() => {
          setCategoryModalVisible(false);
          categoryForm.resetFields();
        }}
        okText={editMode ? 'Сохранить' : 'Создать'}
        cancelText="Отмена"
        width={600}
      >
        <Form form={categoryForm} layout="vertical">
          <Form.Item
            name="name"
            label="Название категории"
            rules={[{ required: true, message: 'Введите название категории' }]}
          >
            <Input placeholder="Например: Точные науки" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Описание"
            rules={[{ required: true, message: 'Введите описание категории' }]}
          >
            <Input.TextArea rows={3} placeholder="Краткое описание категории" />
          </Form.Item>

          <Form.Item
            name="icon"
            label="Иконка (эмодзи)"
          >
            <Input placeholder="🔬" maxLength={2} />
          </Form.Item>

          <Form.Item
            name="color"
            label="Цвет"
          >
            <Input placeholder="#1890ff" />
          </Form.Item>

          <Form.Item
            name="order_index"
            label="Порядок сортировки"
            rules={[{ required: true, message: 'Введите порядок сортировки' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="is_active"
            label="Активна"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* Модальное окно предмета */}
      <Modal
        title={editMode ? 'Редактировать предмет' : 'Создать предмет'}
        open={subjectModalVisible}
        onOk={handleSubjectSubmit}
        onCancel={() => {
          setSubjectModalVisible(false);
          subjectForm.resetFields();
        }}
        okText={editMode ? 'Сохранить' : 'Создать'}
        cancelText="Отмена"
        width={600}
      >
        <Form form={subjectForm} layout="vertical">
          <Form.Item
            name="name"
            label="Название предмета"
            rules={[{ required: true, message: 'Введите название предмета' }]}
          >
            <Input placeholder="Например: Математика" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Описание"
            rules={[{ required: true, message: 'Введите описание предмета' }]}
          >
            <Input.TextArea rows={3} placeholder="Подробное описание предмета" />
          </Form.Item>

          <Form.Item
            name="category_id"
            label="Категория"
            rules={[{ required: true, message: 'Выберите категорию' }]}
          >
            <Select placeholder="Выберите категорию">
              {categoriesData.map(category => (
                <Option key={category.id} value={category.id}>
                  {category.icon} {category.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="order_index"
            label="Порядок сортировки"
            rules={[{ required: true, message: 'Введите порядок сортировки' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="is_active"
            label="Активен"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* Модальное окно типа работы */}
      <Modal
        title={editMode ? 'Редактировать тип работы' : 'Создать тип работы'}
        open={workTypeModalVisible}
        onOk={handleWorkTypeSubmit}
        onCancel={() => {
          setWorkTypeModalVisible(false);
          workTypeForm.resetFields();
        }}
        okText={editMode ? 'Сохранить' : 'Создать'}
        cancelText="Отмена"
        width={600}
      >
        <Form form={workTypeForm} layout="vertical">
          <Form.Item
            name="name"
            label="Название типа работы"
            rules={[{ required: true, message: 'Введите название типа работы' }]}
          >
            <Input placeholder="Например: Курсовая работа" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Описание"
            rules={[{ required: true, message: 'Введите описание типа работы' }]}
          >
            <Input.TextArea rows={3} placeholder="Подробное описание типа работы" />
          </Form.Item>

          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              name="min_price"
              label="Минимальная цена (₽)"
              rules={[{ required: true, message: 'Введите минимальную цену' }]}
              style={{ flex: 1 }}
            >
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              name="max_price"
              label="Максимальная цена (₽)"
              rules={[{ required: true, message: 'Введите максимальную цену' }]}
              style={{ flex: 1 }}
            >
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </div>

          <Form.Item
            name="avg_completion_days"
            label="Среднее время выполнения (дни)"
            rules={[{ required: true, message: 'Введите среднее время выполнения' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="order_index"
            label="Порядок сортировки"
            rules={[{ required: true, message: 'Введите порядок сортировки' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="is_active"
            label="Активен"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};