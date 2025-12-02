export interface DevAccount {
  role: 'partner' | 'admin' | 'director' | 'expert';
  label: string;
  email: string;
  password: string;
}

export const DEV_ACCOUNTS: DevAccount[] = [
  {
    role: 'partner',
    label: 'Партнер',
    email: 'partner@test.com',
    password: 'test123'
  },
  {
    role: 'admin',
    label: 'Администратор',
    email: 'administrator@test.com',
    password: 'test123'
  },
  {
    role: 'director',
    label: 'Директор',
    email: 'director@test.com',
    password: 'test123'
  },
  {
    role: 'expert',
    label: 'Эксперт',
    email: 'expert@test.com',
    password: 'test123'
  }
];

