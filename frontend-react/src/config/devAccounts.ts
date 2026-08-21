export interface DevAccount {
  role: 'client' | 'expert' | 'partner' | 'admin' | 'director' | 'arbitrator';
  label: string;
  email: string;
  password: string;
}


// Пароли демо-учёток не должны попадать в production-бандл.
// В dev задаётся через VITE_DEV_PASSWORD, в проде строка пустая.
const DEV_PASSWORD = import.meta.env.VITE_DEV_PASSWORD ?? '';

export const DEV_ACCOUNTS: DevAccount[] = [
  {
    role: 'client',
    label: 'Клиент',
    email: 'client@test.com',
    password: DEV_PASSWORD,
  },
  {
    role: 'expert',
    label: 'Эксперт',
    email: 'expert@test.com',
    password: DEV_PASSWORD,
  },
  {
    role: 'partner',
    label: 'Партнер',
    email: 'partner@test.com',
    password: DEV_PASSWORD,
  },
  {
    role: 'admin',
    label: 'Администратор',
    email: 'administrator@test.com',
    password: DEV_PASSWORD,
  },
  {
    role: 'director',
    label: 'Директор',
    email: 'director@test.com',
    password: DEV_PASSWORD,
  },
  {
    role: 'arbitrator',
    label: 'Арбитр',
    email: 'arbitrator@test.com',
    password: DEV_PASSWORD,
  },
];

