export interface DevAccount {
  role: 'partner' | 'admin' | 'arbitrator' | 'director';
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
    email: 'admin@test.com',
    password: 'test123'
  },
  {
    role: 'arbitrator',
    label: 'Арбитраж',
    email: 'arbitrator@test.com',
    password: 'test123'
  },
  {
    role: 'director',
    label: 'Директор',
    email: 'director@test.com',
    password: 'test123'
  }
];

