export interface DevAccount {
  role: 'client' | 'expert' | 'partner' | 'admin' | 'director' | 'arbitrator';
  label: string;
  email: string;
  password: string;
}

export const DEV_ACCOUNTS: DevAccount[] = [
  {
    role: 'client',
    label: 'Клиент',
    email: 'client@test.com',
    password: 'test123',
  },
  {
    role: 'expert',
    label: 'Эксперт',
    email: 'expert@test.com',
    password: 'test123',
  },
  {
    role: 'partner',
    label: 'Партнер',
    email: 'partner@test.com',
    password: 'test123',
  },
  {
    role: 'admin',
    label: 'Администратор',
    email: 'administrator@test.com',
    password: 'test123',
  },
  {
    role: 'director',
    label: 'Директор',
    email: 'director@test.com',
    password: 'test123',
  },
  {
    role: 'arbitrator',
    label: 'Арбитр',
    email: 'arbitrator@test.com',
    password: 'test123',
  },
];

