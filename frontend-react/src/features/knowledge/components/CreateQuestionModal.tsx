import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Tag, message } from 'antd';
import { knowledgeApi, Category } from '../api/knowledgeApi';
import { useAuth } from '@/features/auth/hooks/useAuth';

const { TextArea } = Input;
const { Option } = Select;

// Список популярных тегов для вопросов
const AVAILABLE_TAGS = [
  // Математика
  'алгебра', 'геометрия', 'тригонометрия', 'математический анализ', 'интегралы', 'производные',
  'дифференциальные уравнения', 'линейная алгебра', 'матрицы', 'векторы', 'теория вероятностей',
  'статистика', 'комбинаторика', 'теория чисел', 'дискретная математика', 'логарифмы',
  
  // Физика
  'механика', 'термодинамика', 'электричество', 'магнетизм', 'оптика', 'квантовая физика',
  'ядерная физика', 'астрономия', 'кинематика', 'динамика', 'колебания', 'волны',
  
  // Химия
  'органическая химия', 'неорганическая химия', 'физическая химия', 'аналитическая химия',
  'биохимия', 'химические реакции', 'стехиометрия', 'электрохимия', 'термохимия',
  
  // Программирование
  'javascript', 'python', 'java', 'c++', 'c#', 'php', 'ruby', 'go', 'rust', 'swift',
  'алгоритмы', 'структуры данных', 'ООП', 'функциональное программирование', 'базы данных',
  'sql', 'nosql', 'веб-разработка', 'frontend', 'backend', 'fullstack', 'react', 'vue',
  'angular', 'node.js', 'django', 'flask', 'spring', 'git', 'docker', 'kubernetes',
  'машинное обучение', 'искусственный интеллект', 'нейронные сети', 'data science',
  
  // Экономика
  'микроэкономика', 'макроэкономика', 'эконометрика', 'финансы', 'бухгалтерский учет',
  'менеджмент', 'маркетинг', 'инвестиции', 'банковское дело', 'страхование', 'налоги',
  'международная экономика', 'экономическая теория', 'рынок', 'спрос и предложение',
  
  // Право
  'гражданское право', 'уголовное право', 'административное право', 'конституционное право',
  'трудовое право', 'семейное право', 'налоговое право', 'международное право',
  'процессуальное право', 'договоры', 'правонарушения',
  
  // Психология
  'общая психология', 'возрастная психология', 'социальная психология', 'клиническая психология',
  'когнитивная психология', 'психология личности', 'психодиагностика', 'психотерапия',
  'нейропсихология', 'психология развития', 'мотивация', 'эмоции', 'память', 'внимание',
  
  // Биология
  'ботаника', 'зоология', 'анатомия', 'физиология', 'генетика', 'экология', 'эволюция',
  'микробиология', 'молекулярная биология', 'клеточная биология', 'биотехнология',
  
  // Филология и языки
  'русский язык', 'английский язык', 'немецкий язык', 'французский язык', 'испанский язык',
  'литература', 'лингвистика', 'грамматика', 'фонетика', 'лексикология', 'стилистика',
  'перевод', 'сочинение', 'эссе', 'анализ текста',
  
  // История
  'древняя история', 'средние века', 'новое время', 'новейшая история', 'история России',
  'всемирная история', 'археология', 'историография', 'источниковедение',
  
  // Философия
  'онтология', 'гносеология', 'этика', 'эстетика', 'логика', 'философия науки',
  'социальная философия', 'философия истории', 'античная философия', 'современная философия',
  
  // Общие академические
  'курсовая работа', 'дипломная работа', 'реферат', 'эссе', 'доклад', 'презентация',
  'исследование', 'методология', 'библиография', 'оформление', 'цитирование', 'ГОСТ',
  'научная статья', 'диссертация', 'магистерская работа', 'бакалаврская работа',
  
  // Инженерия
  'электротехника', 'механика', 'материаловедение', 'сопромат', 'теоретическая механика',
  'детали машин', 'термех', 'гидравлика', 'теплотехника', 'автоматизация', 'робототехника',
  
  // Архитектура и строительство
  'архитектура', 'строительство', 'проектирование', 'градостроительство', 'конструкции',
  'строительные материалы', 'инженерные системы', 'ландшафтный дизайн',
  
  // Медицина
  'анатомия человека', 'патология', 'фармакология', 'терапия', 'хирургия', 'педиатрия',
  'неврология', 'кардиология', 'эндокринология', 'иммунология', 'вирусология',
  
  // Искусство и дизайн
  'живопись', 'графика', 'скульптура', 'дизайн', 'композиция', 'цветоведение',
  'история искусств', 'архитектурный дизайн', 'веб-дизайн', 'графический дизайн',
  
  // Другие
  'педагогика', 'социология', 'политология', 'культурология', 'журналистика',
  'география', 'геология', 'метеорология', 'экология', 'сельское хозяйство'
];

interface CreateQuestionModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: (question: Question) => void;
}

interface Question {
  id: number;
  title: string;
  description: string;
  category: string;
  author: {
    id: number;
    name: string;
    avatar?: string;
  };
  created_at: string;
  views_count: number;
  answers_count: number;
  status: 'open' | 'answered' | 'closed';
  tags: string[];
}

export const CreateQuestionModal: React.FC<CreateQuestionModalProps> = ({
  visible,
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await knowledgeApi.getCategories();
        setCategories(data);
      } catch (error) {
        console.error('Failed to load categories:', error);
      }
    };

    if (visible) {
      loadCategories();
    }
  }, [visible]);

  const handleTagChange = (selectedTags: string[]) => {
    if (selectedTags.length <= 5) {
      setTags(selectedTags);
    } else {
      message.warning('Можно выбрать максимум 5 тегов');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // Создаем новый вопрос
      const newQuestion: Question = {
        id: Date.now(), // Временный ID
        title: values.title,
        description: values.description,
        category: values.category,
        author: {
          id: user?.id || 0,
          name: user?.username || 'Аноним'
        },
        created_at: new Date().toISOString(),
        views_count: 0,
        answers_count: 0,
        status: 'open',
        tags: tags
      };

      // TODO: Отправка на сервер
      console.log('Creating question:', newQuestion);
      
      message.success('Вопрос успешно создан!');
      form.resetFields();
      setTags([]);
      onSuccess(newQuestion);
    } catch (error) {
      console.error('Failed to create question:', error);
      message.error('Не удалось создать вопрос');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setTags([]);
    onCancel();
  };

  return (
    <Modal
      title="Задать вопрос"
      open={visible}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={loading}
      okText="Опубликовать"
      cancelText="Отмена"
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        autoComplete="off"
      >
        <Form.Item
          name="title"
          label="Заголовок вопроса"
          rules={[
            { required: true, message: 'Введите заголовок вопроса' },
            { min: 10, message: 'Заголовок должен содержать минимум 10 символов' },
            { max: 200, message: 'Заголовок не должен превышать 200 символов' }
          ]}
        >
          <Input 
            placeholder="Кратко опишите ваш вопрос"
            maxLength={200}
            showCount
          />
        </Form.Item>

        <Form.Item
          name="description"
          label="Подробное описание"
          rules={[
            { required: true, message: 'Введите описание вопроса' },
            { min: 20, message: 'Описание должно содержать минимум 20 символов' }
          ]}
        >
          <TextArea
            rows={6}
            placeholder="Опишите ваш вопрос подробнее..."
            maxLength={2000}
            showCount
          />
        </Form.Item>

        <Form.Item
          name="category"
          label="Категория"
          rules={[{ required: true, message: 'Выберите категорию' }]}
        >
          <Select placeholder="Выберите категорию">
            {categories.map(cat => (
              <Option key={cat.id} value={cat.name}>
                {cat.name}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label="Теги (до 5 тегов)">
          <Select
            mode="multiple"
            placeholder="Выберите теги"
            value={tags}
            onChange={handleTagChange}
            maxTagCount={5}
            showSearch
            filterOption={(input, option) =>
              (option?.children as string).toLowerCase().includes(input.toLowerCase())
            }
            style={{ width: '100%' }}
          >
            {AVAILABLE_TAGS.map(tag => (
              <Option key={tag} value={tag}>
                {tag}
              </Option>
            ))}
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
};
