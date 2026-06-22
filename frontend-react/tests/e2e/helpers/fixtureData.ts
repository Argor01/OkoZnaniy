import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface E2EFixtureData {
  password: string;
  client: { email: string; username: string; id: number };
  expert: { email: string; username: string; id: number };
  category: { id: number; name: string };
  subject: { id: number; name: string };
  workType: { id: number; name: string };
  answeredQuestion: { id: number; title: string; answerId: number };
  openQuestion: { id: number; title: string };
  article: { id: number; title: string };
  orders: Array<{ id: number; title: string; budget: number }>;
}

export const authDir = path.resolve(__dirname, '..', '.auth');
export const clientStorageState = path.join(authDir, 'client.json');
export const expertStorageState = path.join(authDir, 'expert.json');

export function loadFixtureData(): E2EFixtureData {
  const fixturePath = path.join(authDir, 'fixture-data.json');
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8')) as E2EFixtureData;
}

export function isoDateDaysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}
