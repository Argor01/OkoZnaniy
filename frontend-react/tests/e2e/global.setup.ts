import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { request, type FullConfig } from '@playwright/test';
import { cleanupE2EData } from './helpers/cleanup';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface LoginPayload {
  access: string;
  refresh: string;
  user: {
    id: number;
    role: string;
    email: string;
    username: string;
  };
}

interface E2EFixtureUser {
  email: string;
  username: string;
  id: number;
}

interface E2EFixtureData {
  password: string;
  client: E2EFixtureUser;
  expert: E2EFixtureUser;
  partner: E2EFixtureUser;
  auth: {
    client: LoginPayload;
    expert: LoginPayload;
    partner: LoginPayload;
  };
  category: { id: number; name: string };
  subject: { id: number; name: string };
  workType: { id: number; name: string };
  answeredQuestion: { id: number; title: string; answerId: number };
  openQuestion: { id: number; title: string };
  article: { id: number; title: string };
  orders: Array<{ id: number; title: string; budget: number }>;
}

const FRONTEND_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5173';
const BACKEND_URL = process.env.PLAYWRIGHT_API_URL ?? 'http://127.0.0.1:8000';
const API_BASE = `${BACKEND_URL}/api`;
const AUTH_DIR = path.resolve(__dirname, '.auth');
const FIXTURE_PATH = path.join(AUTH_DIR, 'fixture-data.json');
const CLIENT_STATE_PATH = path.join(AUTH_DIR, 'client.json');
const EXPERT_STATE_PATH = path.join(AUTH_DIR, 'expert.json');
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const LOCAL_DJANGO_ENV = {
  DEBUG: process.env.DEBUG ?? 'True',
  SECRET_KEY: process.env.SECRET_KEY ?? 'dev-secret-key',
  DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:5432/oko_db',
  POSTGRES_DB: process.env.POSTGRES_DB ?? 'oko_db',
  POSTGRES_USER: process.env.POSTGRES_USER ?? 'postgres',
  POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD ?? 'postgres',
  DB_HOST: process.env.DB_HOST ?? '127.0.0.1',
  DB_PORT: process.env.DB_PORT ?? '5432',
  REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379/0',
};

async function expectOk(response: any, label: string) {
  if (response.ok()) return;
  const body = await response.text();
  throw new Error(`${label} failed: ${response.status()} ${body}`);
}

async function loginUser(api: any, email: string, password: string): Promise<LoginPayload> {
  const response = await api.post(`${API_BASE}/users/token/`, {
    data: { username: email, password },
  });
  await expectOk(response, `login ${email}`);
  return response.json() as Promise<LoginPayload>;
}

function writeStorageState(targetPath: string, login: LoginPayload) {
  const state = {
    cookies: [],
    origins: [
      {
        origin: FRONTEND_URL,
        localStorage: [
          { name: 'access_token', value: login.access },
          { name: 'refresh_token', value: login.refresh },
          { name: 'user_role', value: login.user.role },
        ],
      },
    ],
  };

  fs.writeFileSync(targetPath, JSON.stringify(state, null, 2), 'utf8');
}

function buildSeedScript() {
  return `
import json
import os
from datetime import timedelta
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.utils import timezone
from apps.catalog.models import SubjectCategory, Subject, WorkType
from apps.knowledge.models import Question, QuestionTag, Answer, Article
from apps.orders.models import Order

run_id = os.environ['E2E_RUN_ID']
password = os.environ['E2E_PASSWORD']
User = get_user_model()

client_email = f'client.{run_id}@e2e.local'
expert_email = f'expert.{run_id}@e2e.local'
partner_email = f'partner.{run_id}@e2e.local'
client_username = f'client_{run_id}'
expert_username = f'expert_{run_id}'
partner_username = f'partner_{run_id}'

client = User.objects.create_user(username=client_username, email=client_email, password=password, role='client')
expert = User.objects.create_user(username=expert_username, email=expert_email, password=password, role='expert')
partner = User.objects.create_user(username=partner_username, email=partner_email, password=password, role='partner')

category = SubjectCategory.objects.create(name=f'E2E Category {run_id}', description='Seed category for Playwright tests', order=1)
subject = Subject.objects.create(name=f'E2E Subject {run_id}', description='Seed subject for Playwright tests', category=category, min_price=Decimal('1000.00'))
work_type = WorkType.objects.create(name=f'E2E Work Type {run_id}', description='Seed work type for Playwright tests', base_price=Decimal('1500.00'), estimated_time=48)

answered_question = Question.objects.create(
    title=f'E2E Answered Question {run_id}',
    description='Need a seeded expert answer for Playwright.',
    category=category.name,
    author=client,
)
for tag_name in ['algebra', 'react']:
    QuestionTag.objects.create(question=answered_question, name=tag_name)
answer = Answer.objects.create(question=answered_question, author=expert, content='Seeded expert answer for Playwright.')
answered_question.status = 'answered'
answered_question.save(update_fields=['status'])

open_question = Question.objects.create(
    title=f'E2E Open Question {run_id}',
    description='This question should stay open until the browser answer flow runs.',
    category=category.name,
    author=client,
)
QuestionTag.objects.create(question=open_question, name='python')

article = Article.objects.create(
    title=f'E2E Article {run_id}',
    description='Seed article for knowledge base search.',
    work_type=work_type.name,
    subject=subject.name,
    author=client,
)

orders = []
for title, budget in [
    (f'E2E Algebra Order {run_id}', Decimal('5000.00')),
    (f'E2E Geometry Order {run_id}', Decimal('15000.00')),
    (f'E2E Premium Order {run_id}', Decimal('28000.00')),
]:
    order = Order.objects.create(
        client=client,
        subject=subject,
        work_type=work_type,
        title=title,
        description=f'Description for {title}',
        custom_topic=title,
        deadline=timezone.now() + timedelta(days=7),
        budget=budget,
    )
    orders.append({'id': order.id, 'title': order.title, 'budget': int(budget)})

print(json.dumps({
    'password': password,
    'client': {'email': client.email, 'username': client.username, 'id': client.id},
    'expert': {'email': expert.email, 'username': expert.username, 'id': expert.id},
    'partner': {'email': partner.email, 'username': partner.username, 'id': partner.id},
    'category': {'id': category.id, 'name': category.name},
    'subject': {'id': subject.id, 'name': subject.name},
    'workType': {'id': work_type.id, 'name': work_type.name},
    'answeredQuestion': {'id': answered_question.id, 'title': answered_question.title, 'answerId': answer.id},
    'openQuestion': {'id': open_question.id, 'title': open_question.title},
    'article': {'id': article.id, 'title': article.title},
    'orders': orders,
}))
`.trim();
}

function seedViaOrm(runId: string, password: string): Omit<E2EFixtureData, 'auth'> {
  const pythonScript = buildSeedScript();
  const baseEnv = {
    ...process.env,
    ...LOCAL_DJANGO_ENV,
    E2E_RUN_ID: runId,
    E2E_PASSWORD: password,
  };

  const parseLastJsonLine = (raw: string) => {
    const lines = raw.trim().split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const jsonLine = [...lines].reverse().find((line) => line.startsWith('{') && line.endsWith('}'));
    if (!jsonLine) {
      throw new Error(`Could not find JSON payload in output: ${raw}`);
    }
    return JSON.parse(jsonLine) as Omit<E2EFixtureData, 'auth'>;
  };

  try {
    const stdout = execFileSync('python', ['manage.py', 'shell', '-c', pythonScript], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      env: baseEnv,
    });
    return parseLastJsonLine(stdout);
  } catch {
    const dockerStdout = execFileSync('docker', [
      'exec',
      '-e', `E2E_RUN_ID=${runId}`,
      '-e', `E2E_PASSWORD=${password}`,
      'okoznaniy-backend-1',
      'python',
      'manage.py',
      'shell',
      '-c',
      pythonScript,
    ], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
    return parseLastJsonLine(dockerStdout);
  }
}

export default async function globalSetup(_config: FullConfig) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  cleanupE2EData();

  const bootstrapApi = await request.newContext();
  const runId = `${Date.now()}`;
  const password = 'E2Epass123!';
  const seededData = seedViaOrm(runId, password);

  const clientLogin = await loginUser(bootstrapApi, seededData.client.email, password);
  const expertLogin = await loginUser(bootstrapApi, seededData.expert.email, password);
  const partnerLogin = await loginUser(bootstrapApi, seededData.partner.email, password);

  const fixtureData: E2EFixtureData = {
    ...seededData,
    auth: {
      client: clientLogin,
      expert: expertLogin,
      partner: partnerLogin,
    },
  };

  writeStorageState(CLIENT_STATE_PATH, clientLogin);
  writeStorageState(EXPERT_STATE_PATH, expertLogin);
  fs.writeFileSync(FIXTURE_PATH, JSON.stringify(fixtureData, null, 2), 'utf8');

  await bootstrapApi.dispose();
}
