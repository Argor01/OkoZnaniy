import type { Employee, ExpertApplication, MonthlyTurnover, NetProfit, IncomeDetail, ExpenseDetail, Partner, PartnerTurnoverResponse, KPI, StatisticsSummary } from './types';
import dayjs from 'dayjs';

// Тестовые данные для активных сотрудников
export const mockEmployees: Employee[] = [
  {
    id: 1,
    email: 'admin@okoznany.com',
    first_name: 'Иван',
    last_name: 'Иванов',
    phone: '+7 (999) 123-45-67',
    role: 'admin',
    is_active: true,
    date_joined: '2023-01-15T10:00:00Z',
    last_login: '2024-12-20T14:30:00Z',
    username: 'admin_ivan',
  },
  {
    id: 2,
    email: 'arbitrator1@okoznany.com',
    first_name: 'Петр',
    last_name: 'Петров',
    phone: '+7 (999) 234-56-78',
    role: 'arbitrator',
    is_active: true,
    date_joined: '2023-03-20T09:15:00Z',
    last_login: '2024-12-19T16:45:00Z',
    username: 'arbitrator_petr',
  },
  {
    id: 3,
    email: 'partner1@okoznany.com',
    first_name: 'Мария',
    last_name: 'Сидорова',
    phone: '+7 (999) 345-67-89',
    role: 'partner',
    is_active: true,
    date_joined: '2023-05-10T11:20:00Z',
    last_login: '2024-12-18T10:00:00Z',
    username: 'partner_maria',
  },
  {
    id: 4,
    email: 'expert1@okoznany.com',
    first_name: 'Анна',
    last_name: 'Козлова',
    phone: '+7 (999) 456-78-90',
    role: 'expert',
    is_active: true,
    date_joined: '2023-07-25T08:30:00Z',
    last_login: '2024-12-20T12:15:00Z',
    username: 'expert_anna',
  },
  {
    id: 5,
    email: 'expert2@okoznany.com',
    first_name: 'Дмитрий',
    last_name: 'Смирнов',
    phone: '+7 (999) 567-89-01',
    role: 'expert',
    is_active: true,
    date_joined: '2023-09-12T13:45:00Z',
    last_login: '2024-12-19T09:30:00Z',
    username: 'expert_dmitry',
  },
  {
    id: 6,
    email: 'admin2@okoznany.com',
    first_name: 'Елена',
    last_name: 'Волкова',
    phone: '+7 (999) 678-90-12',
    role: 'admin',
    is_active: true,
    date_joined: '2023-11-05T15:00:00Z',
    last_login: '2024-12-20T11:20:00Z',
    username: 'admin_elena',
  },
  {
    id: 7,
    email: 'arbitrator2@okoznany.com',
    first_name: 'Алексей',
    last_name: 'Новиков',
    phone: '+7 (999) 789-01-23',
    role: 'arbitrator',
    is_active: true,
    date_joined: '2024-01-18T10:30:00Z',
    last_login: '2024-12-17T14:00:00Z',
    username: 'arbitrator_alex',
  },
  {
    id: 8,
    email: 'partner2@okoznany.com',
    first_name: 'Ольга',
    last_name: 'Морозова',
    phone: '+7 (999) 890-12-34',
    role: 'partner',
    is_active: false,
    date_joined: '2024-02-22T12:00:00Z',
    last_login: '2024-12-10T08:15:00Z',
    username: 'partner_olga',
  },
  {
    id: 9,
    email: 'expert3@okoznany.com',
    first_name: 'Сергей',
    last_name: 'Лебедев',
    phone: '+7 (999) 901-23-45',
    role: 'expert',
    is_active: true,
    date_joined: '2024-04-08T09:45:00Z',
    last_login: '2024-12-20T15:30:00Z',
    username: 'expert_sergey',
  },
  {
    id: 10,
    email: 'expert4@okoznany.com',
    first_name: 'Татьяна',
    last_name: 'Соколова',
    phone: '+7 (999) 012-34-56',
    role: 'expert',
    is_active: true,
    date_joined: '2024-06-14T14:20:00Z',
    last_login: '2024-12-19T13:45:00Z',
    username: 'expert_tatiana',
  },
];

// Тестовые данные для анкет экспертов
export const mockExpertApplications: ExpertApplication[] = [
  {
    id: 1,
    user: {
      id: 101,
      email: 'new_expert1@example.com',
      first_name: 'Александр',
      last_name: 'Федоров',
      phone: '+7 (999) 111-22-33',
      role: 'expert',
      is_active: false,
      date_joined: '2024-12-15T10:00:00Z',
      username: 'new_expert_alex',
    },
    experience_years: 5,
    education: 'МГУ, Факультет журналистики, магистр (2019)',
    skills: 'Написание статей, рерайтинг, копирайтинг, SEO-оптимизация',
    portfolio_url: 'https://portfolio.example.com/alexander-fedorov',
    bio: 'Опытный журналист и копирайтер с 5-летним стажем. Специализируюсь на написании статей для бизнеса и маркетинга.',
    biography: 'Работал в ведущих изданиях, опубликовал более 200 статей. Специализируюсь на бизнес-тематике и маркетинге.',
    specializations: ['Журналистика', 'Копирайтинг', 'Маркетинг'],
    status: 'new',
    submitted_at: '2024-12-18T09:00:00Z',
    application_submitted_at: '2024-12-18T09:00:00Z',
  },
  {
    id: 2,
    user: {
      id: 102,
      email: 'new_expert2@example.com',
      first_name: 'Екатерина',
      last_name: 'Попова',
      phone: '+7 (999) 222-33-44',
      role: 'expert',
      is_active: false,
      date_joined: '2024-12-16T11:30:00Z',
      username: 'new_expert_ekaterina',
    },
    experience_years: 8,
    education: 'СПбГУ, Филологический факультет, кандидат филологических наук (2020)',
    skills: 'Академическое письмо, редактирование, переводы, литературное редактирование',
    portfolio_url: 'https://portfolio.example.com/ekaterina-popova',
    bio: 'Филолог с многолетним опытом работы в академической сфере. Специализируюсь на академическом письме и литературном редактировании.',
    biography: 'Защитила кандидатскую диссертацию по филологии. Работала редактором в научных изданиях. Опубликовала более 50 научных статей.',
    specializations: ['Филология', 'Академическое письмо', 'Литературное редактирование'],
    status: 'under_review',
    submitted_at: '2024-12-17T14:20:00Z',
    reviewed_at: '2024-12-19T10:15:00Z',
    application_submitted_at: '2024-12-17T14:20:00Z',
    application_reviewed_at: '2024-12-19T10:15:00Z',
  },
  {
    id: 3,
    user: {
      id: 103,
      email: 'new_expert3@example.com',
      first_name: 'Михаил',
      last_name: 'Васильев',
      phone: '+7 (999) 333-44-55',
      role: 'expert',
      is_active: false,
      date_joined: '2024-12-14T08:45:00Z',
      username: 'new_expert_mikhail',
    },
    experience_years: 3,
    education: 'НИУ ВШЭ, Факультет коммуникаций, бакалавр (2021)',
    skills: 'SMM, контент-маркетинг, создание постов для соцсетей, ведение блогов',
    portfolio_url: 'https://portfolio.example.com/mikhail-vasiliev',
    bio: 'SMM-специалист с опытом работы в digital-агентствах. Создаю контент для соцсетей и веду корпоративные блоги.',
    biography: 'Работал в нескольких digital-агентствах, вел аккаунты крупных брендов. Специализируюсь на создании контента для Instagram и VK.',
    specializations: ['SMM', 'Контент-маркетинг', 'Ведение блогов'],
    status: 'new',
    submitted_at: '2024-12-19T16:30:00Z',
    application_submitted_at: '2024-12-19T16:30:00Z',
  },
  {
    id: 4,
    user: {
      id: 104,
      email: 'new_expert4@example.com',
      first_name: 'Наталья',
      last_name: 'Семенова',
      phone: '+7 (999) 444-55-66',
      role: 'expert',
      is_active: false,
      date_joined: '2024-12-12T13:20:00Z',
      username: 'new_expert_natalya',
    },
    experience_years: 6,
    education: 'МГИМО, Факультет международной журналистики, магистр (2018)',
    skills: 'Деловое письмо, техническое письмо, переводы (английский, немецкий), редактирование',
    portfolio_url: 'https://portfolio.example.com/natalya-semenova',
    bio: 'Журналист-международник с опытом работы в зарубежных изданиях. Специализируюсь на деловом и техническом письме.',
    biography: 'Работала корреспондентом в зарубежных изданиях. Владею английским и немецким языками. Специализируюсь на деловой и технической документации.',
    specializations: ['Деловое письмо', 'Техническое письмо', 'Переводы'],
    status: 'approved',
    submitted_at: '2024-12-10T10:00:00Z',
    reviewed_at: '2024-12-12T15:30:00Z',
    application_submitted_at: '2024-12-10T10:00:00Z',
    application_reviewed_at: '2024-12-12T15:30:00Z',
    application_approved: true,
  },
  {
    id: 5,
    user: {
      id: 105,
      email: 'new_expert5@example.com',
      first_name: 'Игорь',
      last_name: 'Павлов',
      phone: '+7 (999) 555-66-77',
      role: 'expert',
      is_active: false,
      date_joined: '2024-12-11T09:15:00Z',
      username: 'new_expert_igor',
    },
    experience_years: 4,
    education: 'МГТУ им. Н.Э. Баумана, Факультет информатики, бакалавр (2020)',
    skills: 'Техническое письмо, документация, инструкции, технические переводы',
    portfolio_url: 'https://portfolio.example.com/igor-pavlov',
    bio: 'Технический писатель с опытом работы в IT-компаниях. Создаю техническую документацию и инструкции.',
    biography: 'Работал техническим писателем в нескольких IT-компаниях. Создавал документацию для программного обеспечения и API.',
    specializations: ['Техническое письмо', 'Документация', 'Инструкции'],
    status: 'rejected',
    submitted_at: '2024-12-08T11:00:00Z',
    reviewed_at: '2024-12-09T14:00:00Z',
    application_submitted_at: '2024-12-08T11:00:00Z',
    application_reviewed_at: '2024-12-09T14:00:00Z',
    application_approved: false,
  },
  {
    id: 6,
    user: {
      id: 106,
      email: 'new_expert6@example.com',
      first_name: 'Юлия',
      last_name: 'Иванова',
      phone: '+7 (999) 666-77-88',
      role: 'expert',
      is_active: false,
      date_joined: '2024-12-13T12:45:00Z',
      username: 'new_expert_yulia',
    },
    experience_years: 7,
    education: 'РГГУ, Факультет журналистики, магистр (2017)',
    skills: 'Журналистика, интервью, репортажи, новостные статьи, аналитика',
    portfolio_url: 'https://portfolio.example.com/yulia-ivanova',
    bio: 'Журналист с опытом работы в новостных изданиях. Специализируюсь на написании новостных статей и репортажей.',
    biography: 'Работала журналистом в ведущих новостных изданиях. Проводила интервью с известными людьми. Написала более 300 новостных статей.',
    specializations: ['Журналистика', 'Новости', 'Репортажи'],
    status: 'under_review',
    submitted_at: '2024-12-18T15:00:00Z',
    reviewed_at: '2024-12-19T11:30:00Z',
    application_submitted_at: '2024-12-18T15:00:00Z',
    application_reviewed_at: '2024-12-19T11:30:00Z',
  },
];

// Тестовые данные для архивированных сотрудников
export const mockArchivedEmployees: Employee[] = [
  {
    id: 11,
    email: 'archived1@okoznany.com',
    first_name: 'Владимир',
    last_name: 'Кузнецов',
    phone: '+7 (999) 111-11-11',
    role: 'expert',
    is_active: false,
    date_joined: '2022-06-10T10:00:00Z',
    last_login: '2024-10-15T12:00:00Z',
    username: 'archived_vladimir',
  },
  {
    id: 12,
    email: 'archived2@okoznany.com',
    first_name: 'Светлана',
    last_name: 'Орлова',
    phone: '+7 (999) 222-22-22',
    role: 'partner',
    is_active: false,
    date_joined: '2022-08-20T09:00:00Z',
    last_login: '2024-09-20T14:00:00Z',
    username: 'archived_svetlana',
  },
];

// Функции для генерации тестовых финансовых данных

// Генерация месячного оборота
export const generateMonthlyTurnover = (period: string): MonthlyTurnover => {
  const month = dayjs(period).startOf('month');
  const daysInMonth = month.daysInMonth();
  const dailyData: Array<{ date: string; amount: number }> = [];
  
  // Базовый дневной оборот с небольшими колебаниями
  let total = 0;
  for (let i = 0; i < daysInMonth; i++) {
    const date = month.add(i, 'day');
    // Выходные дни имеют меньший оборот
    const dayOfWeek = date.day();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const baseAmount = isWeekend ? 35000 : 50000;
    // Добавляем случайные колебания
    const amount = baseAmount + Math.random() * 20000 - 10000;
    dailyData.push({
      date: date.format('YYYY-MM-DD'),
      amount: Math.round(amount),
    });
    total += amount;
  }
  
  const previousMonth = month.subtract(1, 'month');
  const previousTotal = total * (0.85 + Math.random() * 0.15); // Предыдущий месяц на 0-15% меньше
  const change = total - previousTotal;
  const changePercent = (change / previousTotal) * 100;
  
  return {
    period,
    total: Math.round(total),
    previous_period: Math.round(previousTotal),
    previousPeriod: Math.round(previousTotal),
    change: Math.round(change),
    change_percent: Math.round(changePercent * 100) / 100,
    changePercent: Math.round(changePercent * 100) / 100,
    daily_data: dailyData,
    dailyData: dailyData,
  };
};

// Генерация чистой прибыли
export const generateNetProfit = (startDate: string, endDate: string): NetProfit => {
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  const days = end.diff(start, 'day') + 1;
  
  // Доходы по категориям
  const incomeCategories = [
    { category: 'Выполнение заказов', baseAmount: 800000 },
    { category: 'Подписки', baseAmount: 150000 },
    { category: 'Комиссии', baseAmount: 100000 },
    { category: 'Реклама', baseAmount: 50000 },
    { category: 'Прочее', baseAmount: 30000 },
  ];
  
  // Расходы по категориям
  const expenseCategories = [
    { category: 'Зарплаты сотрудников', baseAmount: 400000 },
    { category: 'Комиссии экспертам', baseAmount: 200000 },
    { category: 'Комиссии партнёрам', baseAmount: 80000 },
    { category: 'Маркетинг', baseAmount: 60000 },
    { category: 'Инфраструктура', baseAmount: 50000 },
    { category: 'Налоги', baseAmount: 120000 },
    { category: 'Прочее', baseAmount: 40000 },
  ];
  
  const incomeBreakdown = incomeCategories.map(cat => ({
    category: cat.category,
    amount: Math.round(cat.baseAmount * (days / 30) * (0.9 + Math.random() * 0.2)),
    percentage: 0,
  }));
  
  const expenseBreakdown = expenseCategories.map(cat => ({
    category: cat.category,
    amount: Math.round(cat.baseAmount * (days / 30) * (0.9 + Math.random() * 0.2)),
    percentage: 0,
  }));
  
  const totalIncome = incomeBreakdown.reduce((sum, item) => sum + item.amount, 0);
  const totalExpense = expenseBreakdown.reduce((sum, item) => sum + item.amount, 0);
  const totalProfit = totalIncome - totalExpense;
  
  // Рассчитываем проценты
  incomeBreakdown.forEach(item => {
    item.percentage = Math.round((item.amount / totalIncome) * 100 * 100) / 100;
  });
  
  expenseBreakdown.forEach(item => {
    item.percentage = Math.round((item.amount / totalExpense) * 100 * 100) / 100;
  });
  
  // Генерируем ежедневные данные
  const dailyData: Array<{ date: string; profit: number }> = [];
  for (let i = 0; i < days; i++) {
    const date = start.add(i, 'day');
    const dailyIncome = totalIncome / days * (0.8 + Math.random() * 0.4);
    const dailyExpense = totalExpense / days * (0.8 + Math.random() * 0.4);
    dailyData.push({
      date: date.format('YYYY-MM-DD'),
      profit: Math.round(dailyIncome - dailyExpense),
    });
  }
  
  // Предыдущий период
  const prevDays = days;
  const previousPeriodTotal = totalProfit * (0.8 + Math.random() * 0.3);
  const change = totalProfit - previousPeriodTotal;
  const changePercent = (change / previousPeriodTotal) * 100;
  
  return {
    period: {
      start: startDate,
      end: endDate,
    },
    total: Math.round(totalProfit),
    income: Math.round(totalIncome),
    expense: Math.round(totalExpense),
    previous_period: Math.round(previousPeriodTotal),
    previousPeriod: Math.round(previousPeriodTotal),
    change: Math.round(change),
    change_percent: Math.round(changePercent * 100) / 100,
    changePercent: Math.round(changePercent * 100) / 100,
    daily_data: dailyData,
    dailyData: dailyData,
    income_breakdown: incomeBreakdown,
    incomeBreakdown: incomeBreakdown,
    expense_breakdown: expenseBreakdown,
    expenseBreakdown: expenseBreakdown,
  };
};

// Генерация детализации доходов
export const generateIncomeDetails = (startDate: string, endDate: string): IncomeDetail[] => {
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  const days = end.diff(start, 'day') + 1;
  
  const categories = [
    'Выполнение заказов',
    'Подписки',
    'Комиссии',
    'Реклама',
    'Прочее',
  ];
  
  const descriptions = {
    'Выполнение заказов': [
      'Заказ #1234 - Написание статьи',
      'Заказ #1235 - Редактирование текста',
      'Заказ #1236 - Перевод документа',
      'Заказ #1237 - Копирайтинг',
      'Заказ #1238 - Техническое письмо',
    ],
    'Подписки': [
      'Премиум подписка - Месячная',
      'Премиум подписка - Годовая',
      'Базовая подписка - Месячная',
    ],
    'Комиссии': [
      'Комиссия с заказа #1234',
      'Комиссия с заказа #1235',
      'Комиссия с заказа #1236',
    ],
    'Реклама': [
      'Рекламный баннер - Главная страница',
      'Рекламный баннер - Категория',
      'Партнёрская реклама',
    ],
    'Прочее': [
      'Возврат средств',
      'Бонусная выплата',
      'Прочие поступления',
    ],
  };
  
  const incomeDetails: IncomeDetail[] = [];
  const ordersPerDay = 15;
  
  for (let i = 0; i < days * ordersPerDay; i++) {
    const dayOffset = Math.floor(i / ordersPerDay);
    const date = start.add(dayOffset, 'day');
    const category = categories[Math.floor(Math.random() * categories.length)];
    const categoryDescriptions = descriptions[category as keyof typeof descriptions];
    const description = categoryDescriptions[Math.floor(Math.random() * categoryDescriptions.length)];
    
    let amount = 0;
    switch (category) {
      case 'Выполнение заказов':
        amount = 2000 + Math.random() * 8000;
        break;
      case 'Подписки':
        amount = 500 + Math.random() * 2000;
        break;
      case 'Комиссии':
        amount = 500 + Math.random() * 1500;
        break;
      case 'Реклама':
        amount = 1000 + Math.random() * 3000;
        break;
      case 'Прочее':
        amount = 100 + Math.random() * 500;
        break;
    }
    
    incomeDetails.push({
      date: date.format('YYYY-MM-DD'),
      category,
      amount: Math.round(amount),
      description,
      order_id: 1000 + i,
      orderId: 1000 + i,
      partner_id: Math.random() > 0.7 ? Math.floor(Math.random() * 5) + 1 : undefined,
      partnerId: Math.random() > 0.7 ? Math.floor(Math.random() * 5) + 1 : undefined,
    });
  }
  
  // Сортируем по дате
  return incomeDetails.sort((a, b) => dayjs(a.date).unix() - dayjs(b.date).unix());
};

// Генерация детализации расходов
export const generateExpenseDetails = (startDate: string, endDate: string): ExpenseDetail[] => {
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  const days = end.diff(start, 'day') + 1;
  
  const categories = [
    'Зарплаты сотрудников',
    'Комиссии экспертам',
    'Комиссии партнёрам',
    'Маркетинг',
    'Инфраструктура',
    'Налоги',
    'Прочее',
  ];
  
  const recipients = [
    { id: 1, name: 'Иван Иванов' },
    { id: 2, name: 'Петр Петров' },
    { id: 3, name: 'Мария Сидорова' },
    { id: 4, name: 'Анна Козлова' },
    { id: 5, name: 'Дмитрий Смирнов' },
  ];
  
  const descriptions = {
    'Зарплаты сотрудников': [
      'Зарплата - Администратор',
      'Зарплата - Арбитр',
      'Зарплата - Менеджер',
    ],
    'Комиссии экспертам': [
      'Выплата комиссии эксперту за заказ',
      'Выплата комиссии эксперту за выполнение работы',
    ],
    'Комиссии партнёрам': [
      'Выплата комиссии партнёру',
      'Реферальная комиссия',
    ],
    'Маркетинг': [
      'Реклама в Google',
      'Реклама в Яндекс',
      'SMM-кампания',
      'Контент-маркетинг',
    ],
    'Инфраструктура': [
      'Хостинг серверов',
      'Облачное хранилище',
      'Платежные системы',
      'Лицензии ПО',
    ],
    'Налоги': [
      'НДС',
      'Налог на прибыль',
      'Страховые взносы',
    ],
    'Прочее': [
      'Офисные расходы',
      'Канцелярские товары',
      'Прочие расходы',
    ],
  };
  
  const expenseDetails: ExpenseDetail[] = [];
  const expensesPerDay = 10;
  
  for (let i = 0; i < days * expensesPerDay; i++) {
    const dayOffset = Math.floor(i / expensesPerDay);
    const date = start.add(dayOffset, 'day');
    const category = categories[Math.floor(Math.random() * categories.length)];
    const categoryDescriptions = descriptions[category as keyof typeof descriptions];
    const description = categoryDescriptions[Math.floor(Math.random() * categoryDescriptions.length)];
    
    let amount = 0;
    switch (category) {
      case 'Зарплаты сотрудников':
        amount = 30000 + Math.random() * 50000;
        break;
      case 'Комиссии экспертам':
        amount = 1000 + Math.random() * 5000;
        break;
      case 'Комиссии партнёрам':
        amount = 500 + Math.random() * 2000;
        break;
      case 'Маркетинг':
        amount = 2000 + Math.random() * 8000;
        break;
      case 'Инфраструктура':
        amount = 5000 + Math.random() * 10000;
        break;
      case 'Налоги':
        amount = 10000 + Math.random() * 20000;
        break;
      case 'Прочее':
        amount = 500 + Math.random() * 2000;
        break;
    }
    
    const recipient = category.includes('Зарплаты') || category.includes('Комиссии') 
      ? recipients[Math.floor(Math.random() * recipients.length)]
      : null;
    
    expenseDetails.push({
      date: date.format('YYYY-MM-DD'),
      category,
      amount: Math.round(amount),
      description,
      recipient_id: recipient?.id,
      recipientId: recipient?.id,
      recipient_name: recipient?.name,
      recipientName: recipient?.name,
    });
  }
  
  // Сортируем по дате
  return expenseDetails.sort((a, b) => dayjs(a.date).unix() - dayjs(b.date).unix());
};

// Тестовые данные для партнёров
export const mockPartners: Partner[] = [
  {
    id: 1,
    firstName: 'Мария',
    lastName: 'Сидорова',
    first_name: 'Мария',
    last_name: 'Сидорова',
    email: 'partner1@okoznany.com',
    phone: '+7 (999) 345-67-89',
    referralCode: 'REF-MARIA-2023',
    referral_code: 'REF-MARIA-2023',
    commissionPercent: 15,
    commission_percent: 15,
    totalReferrals: 45,
    total_referrals: 45,
    activeReferrals: 32,
    active_referrals: 32,
    totalEarnings: 1250000,
    total_earnings: 1250000,
    isActive: true,
    is_active: true,
    status: 'active',
    dateJoined: '2023-05-10T11:20:00Z',
    date_joined: '2023-05-10T11:20:00Z',
    referrals: [
      { id: 101, first_name: 'Иван', last_name: 'Иванов', email: 'ivan@example.com', date_joined: '2023-06-15T10:00:00Z', is_active: true },
      { id: 102, first_name: 'Петр', last_name: 'Петров', email: 'petr@example.com', date_joined: '2023-07-20T11:00:00Z', is_active: true },
      { id: 103, first_name: 'Анна', last_name: 'Козлова', email: 'anna@example.com', date_joined: '2023-08-10T09:00:00Z', is_active: false },
    ],
  },
  {
    id: 2,
    firstName: 'Ольга',
    lastName: 'Морозова',
    first_name: 'Ольга',
    last_name: 'Морозова',
    email: 'partner2@okoznany.com',
    phone: '+7 (999) 890-12-34',
    referralCode: 'REF-OLGA-2024',
    referral_code: 'REF-OLGA-2024',
    commissionPercent: 12,
    commission_percent: 12,
    totalReferrals: 28,
    total_referrals: 28,
    activeReferrals: 18,
    active_referrals: 18,
    totalEarnings: 680000,
    total_earnings: 680000,
    isActive: false,
    is_active: false,
    status: 'inactive',
    dateJoined: '2024-02-22T12:00:00Z',
    date_joined: '2024-02-22T12:00:00Z',
    referrals: [
      { id: 201, first_name: 'Дмитрий', last_name: 'Смирнов', email: 'dmitry@example.com', date_joined: '2024-03-01T10:00:00Z', is_active: true },
      { id: 202, first_name: 'Елена', last_name: 'Волкова', email: 'elena@example.com', date_joined: '2024-03-15T11:00:00Z', is_active: true },
    ],
  },
  {
    id: 3,
    firstName: 'Алексей',
    lastName: 'Новиков',
    first_name: 'Алексей',
    last_name: 'Новиков',
    email: 'partner3@okoznany.com',
    phone: '+7 (999) 456-78-90',
    referralCode: 'REF-ALEX-2023',
    referral_code: 'REF-ALEX-2023',
    commissionPercent: 18,
    commission_percent: 18,
    totalReferrals: 67,
    total_referrals: 67,
    activeReferrals: 52,
    active_referrals: 52,
    totalEarnings: 2100000,
    total_earnings: 2100000,
    isActive: true,
    is_active: true,
    status: 'active',
    dateJoined: '2023-03-15T09:30:00Z',
    date_joined: '2023-03-15T09:30:00Z',
    referrals: [
      { id: 301, first_name: 'Сергей', last_name: 'Лебедев', email: 'sergey@example.com', date_joined: '2023-04-01T10:00:00Z', is_active: true },
      { id: 302, first_name: 'Татьяна', last_name: 'Соколова', email: 'tatiana@example.com', date_joined: '2023-04-15T11:00:00Z', is_active: true },
      { id: 303, first_name: 'Игорь', last_name: 'Павлов', email: 'igor@example.com', date_joined: '2023-05-01T09:00:00Z', is_active: true },
      { id: 304, first_name: 'Юлия', last_name: 'Иванова', email: 'yulia@example.com', date_joined: '2023-05-20T10:00:00Z', is_active: false },
    ],
  },
  {
    id: 4,
    firstName: 'Елена',
    lastName: 'Волкова',
    first_name: 'Елена',
    last_name: 'Волкова',
    email: 'partner4@okoznany.com',
    phone: '+7 (999) 567-89-01',
    referralCode: 'REF-ELENA-2023',
    referral_code: 'REF-ELENA-2023',
    commissionPercent: 10,
    commission_percent: 10,
    totalReferrals: 23,
    total_referrals: 23,
    activeReferrals: 15,
    active_referrals: 15,
    totalEarnings: 450000,
    total_earnings: 450000,
    isActive: true,
    is_active: true,
    status: 'active',
    dateJoined: '2023-08-20T10:15:00Z',
    date_joined: '2023-08-20T10:15:00Z',
    referrals: [
      { id: 401, first_name: 'Александр', last_name: 'Федоров', email: 'alexander@example.com', date_joined: '2023-09-01T10:00:00Z', is_active: true },
      { id: 402, first_name: 'Екатерина', last_name: 'Попова', email: 'ekaterina@example.com', date_joined: '2023-09-15T11:00:00Z', is_active: true },
    ],
  },
  {
    id: 5,
    firstName: 'Дмитрий',
    lastName: 'Петров',
    first_name: 'Дмитрий',
    last_name: 'Петров',
    email: 'partner5@okoznany.com',
    phone: '+7 (999) 678-90-12',
    referralCode: 'REF-DMITRY-2024',
    referral_code: 'REF-DMITRY-2024',
    commissionPercent: 20,
    commission_percent: 20,
    totalReferrals: 89,
    total_referrals: 89,
    activeReferrals: 71,
    active_referrals: 71,
    totalEarnings: 3200000,
    total_earnings: 3200000,
    isActive: true,
    is_active: true,
    status: 'active',
    dateJoined: '2024-01-10T08:00:00Z',
    date_joined: '2024-01-10T08:00:00Z',
    referrals: [
      { id: 501, first_name: 'Михаил', last_name: 'Васильев', email: 'mikhail@example.com', date_joined: '2024-01-20T10:00:00Z', is_active: true },
      { id: 502, first_name: 'Наталья', last_name: 'Семенова', email: 'natalya@example.com', date_joined: '2024-02-01T11:00:00Z', is_active: true },
      { id: 503, first_name: 'Владимир', last_name: 'Кузнецов', email: 'vladimir@example.com', date_joined: '2024-02-15T09:00:00Z', is_active: true },
      { id: 504, first_name: 'Светлана', last_name: 'Орлова', email: 'svetlana@example.com', date_joined: '2024-03-01T10:00:00Z', is_active: false },
      { id: 505, first_name: 'Андрей', last_name: 'Морозов', email: 'andrey@example.com', date_joined: '2024-03-20T11:00:00Z', is_active: true },
    ],
  },
  {
    id: 6,
    firstName: 'Анна',
    lastName: 'Козлова',
    first_name: 'Анна',
    last_name: 'Козлова',
    email: 'partner6@okoznany.com',
    phone: '+7 (999) 789-01-23',
    referralCode: 'REF-ANNA-2023',
    referral_code: 'REF-ANNA-2023',
    commissionPercent: 14,
    commission_percent: 14,
    totalReferrals: 34,
    total_referrals: 34,
    activeReferrals: 22,
    active_referrals: 22,
    totalEarnings: 780000,
    total_earnings: 780000,
    isActive: true,
    is_active: true,
    status: 'active',
    dateJoined: '2023-09-25T14:30:00Z',
    date_joined: '2023-09-25T14:30:00Z',
    referrals: [
      { id: 601, first_name: 'Павел', last_name: 'Соколов', email: 'pavel@example.com', date_joined: '2023-10-05T10:00:00Z', is_active: true },
      { id: 602, first_name: 'Марина', last_name: 'Новикова', email: 'marina@example.com', date_joined: '2023-10-20T11:00:00Z', is_active: true },
    ],
  },
  {
    id: 7,
    firstName: 'Сергей',
    lastName: 'Смирнов',
    first_name: 'Сергей',
    last_name: 'Смирнов',
    email: 'partner7@okoznany.com',
    phone: '+7 (999) 890-12-45',
    referralCode: 'REF-SERGEY-2024',
    referral_code: 'REF-SERGEY-2024',
    commissionPercent: 16,
    commission_percent: 16,
    totalReferrals: 56,
    total_referrals: 56,
    activeReferrals: 41,
    active_referrals: 41,
    totalEarnings: 1450000,
    total_earnings: 1450000,
    isActive: true,
    is_active: true,
    status: 'active',
    dateJoined: '2024-04-05T09:00:00Z',
    date_joined: '2024-04-05T09:00:00Z',
    referrals: [
      { id: 701, first_name: 'Роман', last_name: 'Петров', email: 'roman@example.com', date_joined: '2024-04-15T10:00:00Z', is_active: true },
      { id: 702, first_name: 'Оксана', last_name: 'Иванова', email: 'oksana@example.com', date_joined: '2024-05-01T11:00:00Z', is_active: true },
      { id: 703, first_name: 'Виктор', last_name: 'Федоров', email: 'viktor@example.com', date_joined: '2024-05-15T09:00:00Z', is_active: true },
    ],
  },
  {
    id: 8,
    firstName: 'Татьяна',
    lastName: 'Лебедева',
    first_name: 'Татьяна',
    last_name: 'Лебедева',
    email: 'partner8@okoznany.com',
    phone: '+7 (999) 901-23-56',
    referralCode: 'REF-TATIANA-2023',
    referral_code: 'REF-TATIANA-2023',
    commissionPercent: 11,
    commission_percent: 11,
    totalReferrals: 19,
    total_referrals: 19,
    activeReferrals: 12,
    active_referrals: 12,
    totalEarnings: 320000,
    total_earnings: 320000,
    isActive: false,
    is_active: false,
    status: 'inactive',
    dateJoined: '2023-11-10T13:20:00Z',
    date_joined: '2023-11-10T13:20:00Z',
    referrals: [
      { id: 801, first_name: 'Галина', last_name: 'Морозова', email: 'galina@example.com', date_joined: '2023-12-01T10:00:00Z', is_active: true },
    ],
  },
];

// Генерация оборота по партнёрам
export const generatePartnersTurnover = (period: string | [string, string]): PartnerTurnoverResponse => {
  let startDate: string;
  let endDate: string;
  
  if (typeof period === 'string') {
    const month = dayjs(period).startOf('month');
    startDate = month.format('YYYY-MM-DD');
    endDate = month.endOf('month').format('YYYY-MM-DD');
  } else {
    startDate = period[0];
    endDate = period[1];
  }
  
  const days = dayjs(endDate).diff(dayjs(startDate), 'day') + 1;
  
  // Генерируем оборот для каждого партнёра
  const partnersTurnover = mockPartners.map(partner => {
    // Базовый оборот зависит от количества рефералов и активности партнёра
    const baseTurnover = partner.totalReferrals * 50000 * (days / 30);
    const turnover = baseTurnover * (0.7 + Math.random() * 0.6); // Вариация ±30%
    const commission = (turnover * partner.commissionPercent) / 100;
    const referralsCount = partner.activeReferrals;
    
    return {
      id: partner.id,
      partnerId: partner.id,
      firstName: partner.firstName,
      first_name: partner.first_name,
      lastName: partner.lastName,
      last_name: partner.last_name,
      partnerName: `${partner.firstName} ${partner.lastName}`,
      email: partner.email,
      partnerEmail: partner.email,
      referralsCount: referralsCount,
      referrals_count: referralsCount,
      turnover: Math.round(turnover),
      commission: Math.round(commission),
      percentageOfTotal: 0, // Будет рассчитано после
    };
  });
  
  // Рассчитываем общий оборот
  const totalTurnover = partnersTurnover.reduce((sum, p) => sum + p.turnover, 0);
  
  // Рассчитываем проценты
  partnersTurnover.forEach(partner => {
    partner.percentageOfTotal = Math.round((partner.turnover / totalTurnover) * 100 * 100) / 100;
  });
  
  // Сортируем по обороту (от большего к меньшему)
  partnersTurnover.sort((a, b) => b.turnover - a.turnover);
  
  return {
    period: typeof period === 'string' ? period : `${startDate} - ${endDate}`,
    totalTurnover: Math.round(totalTurnover),
    partners: partnersTurnover,
  };
};

// Генерация KPI
export const generateKPI = (startDate: string, endDate: string): KPI => {
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  const days = end.diff(start, 'day') + 1;
  
  // Базовые значения
  const baseTurnover = 1500000 * (days / 30);
  const baseProfit = 350000 * (days / 30);
  const baseOrders = Math.round(450 * (days / 30));
  const baseAverageCheck = 3500;
  
  // Добавляем вариацию
  const totalTurnover = baseTurnover * (0.9 + Math.random() * 0.2);
  const netProfit = baseProfit * (0.8 + Math.random() * 0.4);
  const activeOrders = Math.round(baseOrders * (0.85 + Math.random() * 0.3));
  const averageOrderValue = baseAverageCheck * (0.9 + Math.random() * 0.2);
  
  // Предыдущий период (для расчета изменений)
  const prevTurnover = totalTurnover * (0.85 + Math.random() * 0.15);
  const prevProfit = netProfit * (0.8 + Math.random() * 0.3);
  const prevOrders = activeOrders * (0.9 + Math.random() * 0.2);
  const prevAverageCheck = averageOrderValue * (0.95 + Math.random() * 0.1);
  
  // Рассчитываем изменения
  const turnoverChange = ((totalTurnover - prevTurnover) / prevTurnover) * 100;
  const profitChange = ((netProfit - prevProfit) / prevProfit) * 100;
  const ordersChange = ((activeOrders - prevOrders) / prevOrders) * 100;
  const averageCheckChange = ((averageOrderValue - prevAverageCheck) / prevAverageCheck) * 100;
  
  // Количество пользователей (из тестовых данных)
  const totalClients = 1250 + Math.floor(Math.random() * 200);
  const totalExperts = mockEmployees.filter(e => e.role === 'expert' && e.is_active).length;
  const totalPartners = mockPartners.filter(p => p.isActive || p.is_active).length;
  const conversionRate = 15 + Math.random() * 5;
  
  return {
    totalTurnover: Math.round(totalTurnover),
    total_turnover: Math.round(totalTurnover),
    netProfit: Math.round(netProfit),
    net_profit: Math.round(netProfit),
    activeOrders: activeOrders,
    active_orders: activeOrders,
    averageOrderValue: Math.round(averageOrderValue),
    averageOrder: Math.round(averageOrderValue),
    averageCheck: Math.round(averageOrderValue),
    average_check: Math.round(averageOrderValue),
    totalClients: totalClients,
    total_clients: totalClients,
    totalExperts: totalExperts,
    total_experts: totalExperts,
    totalPartners: totalPartners,
    total_partners: totalPartners,
    conversionRate: Math.round(conversionRate * 100) / 100,
    conversion_rate: Math.round(conversionRate * 100) / 100,
    turnoverChange: Math.round(turnoverChange * 100) / 100,
    turnover_change: Math.round(turnoverChange * 100) / 100,
    profitChange: Math.round(profitChange * 100) / 100,
    profit_change: Math.round(profitChange * 100) / 100,
    ordersChange: Math.round(ordersChange * 100) / 100,
    orders_change: Math.round(ordersChange * 100) / 100,
    averageCheckChange: Math.round(averageCheckChange * 100) / 100,
    average_check_change: Math.round(averageCheckChange * 100) / 100,
  };
};

// Генерация сводной статистики
export const generateStatisticsSummary = (startDate: string, endDate: string): StatisticsSummary => {
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  const days = end.diff(start, 'day') + 1;
  
  // Генерируем текущий период KPI
  const currentKPI = generateKPI(startDate, endDate);
  
  // Генерируем предыдущий период
  const prevStart = start.subtract(days, 'day');
  const prevEnd = start.subtract(1, 'day');
  const previousKPI = generateKPI(prevStart.format('YYYY-MM-DD'), prevEnd.format('YYYY-MM-DD'));
  
  // Рассчитываем изменения
  const turnoverChange = ((currentKPI.totalTurnover! - previousKPI.totalTurnover!) / previousKPI.totalTurnover!) * 100;
  const profitChange = ((currentKPI.netProfit! - previousKPI.netProfit!) / previousKPI.netProfit!) * 100;
  const ordersChange = ((currentKPI.activeOrders! - previousKPI.activeOrders!) / previousKPI.activeOrders!) * 100;
  const averageCheckChange = ((currentKPI.averageCheck! - previousKPI.averageCheck!) / previousKPI.averageCheck!) * 100;
  
  // Генерируем тренды (ежедневные данные)
  const trends = {
    turnover: [] as Array<{ date: string; value: number }>,
    profit: [] as Array<{ date: string; value: number }>,
    orders: [] as Array<{ date: string; value: number }>,
  };
  
  const dailyTurnover = currentKPI.totalTurnover! / days;
  const dailyProfit = currentKPI.netProfit! / days;
  const dailyOrders = currentKPI.activeOrders! / days;
  
  for (let i = 0; i < days; i++) {
    const date = start.add(i, 'day');
    trends.turnover.push({
      date: date.format('YYYY-MM-DD'),
      value: Math.round(dailyTurnover * (0.7 + Math.random() * 0.6)),
    });
    trends.profit.push({
      date: date.format('YYYY-MM-DD'),
      value: Math.round(dailyProfit * (0.6 + Math.random() * 0.8)),
    });
    trends.orders.push({
      date: date.format('YYYY-MM-DD'),
      value: Math.round(dailyOrders * (0.8 + Math.random() * 0.4)),
    });
  }
  
  return {
    period: {
      start: startDate,
      end: endDate,
    },
    kpi: currentKPI,
    previousPeriod: previousKPI,
    previous_period: previousKPI,
    currentPeriod: {
      turnover: currentKPI.totalTurnover,
      profit: currentKPI.netProfit,
      orders: currentKPI.activeOrders,
      averageCheck: currentKPI.averageCheck,
      average_check: currentKPI.averageCheck,
    },
    current_period: {
      turnover: currentKPI.totalTurnover,
      profit: currentKPI.netProfit,
      orders: currentKPI.activeOrders,
      averageCheck: currentKPI.averageCheck,
      average_check: currentKPI.averageCheck,
    },
    trends: trends,
    turnoverChange: Math.round(turnoverChange * 100) / 100,
    turnover_change: Math.round(turnoverChange * 100) / 100,
    profitChange: Math.round(profitChange * 100) / 100,
    profit_change: Math.round(profitChange * 100) / 100,
    ordersChange: Math.round(ordersChange * 100) / 100,
    orders_change: Math.round(ordersChange * 100) / 100,
    averageCheckChange: Math.round(averageCheckChange * 100) / 100,
    average_check_change: Math.round(averageCheckChange * 100) / 100,
  };
};

