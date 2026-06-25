import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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

function buildCleanupScript() {
  return `
from django.contrib.auth import get_user_model
from apps.catalog.models import SubjectCategory, Subject, WorkType
from apps.knowledge.models import Article, Question
from apps.orders.models import Order

User = get_user_model()

TEST_ORDER_REGEX = r'^(E2E |API Create Order |Updated Order )'
TEST_QUESTION_REGEX = r'^(E2E |Knowledge Question |Answer Target |Diag Question )'
TEST_ARTICLE_REGEX = r'^(E2E Article |API Article )'
TEST_CATEGORY_REGEX = r'^(E2[Ee] Category |Catalog Category )'
TEST_SUBJECT_REGEX = r'^(E2[eE] subject |Catalog subject )'
TEST_WORK_TYPE_REGEX = r'^(E2[eE] work type |Catalog work type )'

order_patterns = [
    r'^E2E ',
    r'^API Create Order ',
    r'^Updated Order ',
]
question_patterns = [
    r'^E2E ',
    r'^Knowledge Question ',
    r'^Answer Target ',
    r'^Diag Question ',
]
article_patterns = [
    r'^E2E Article ',
    r'^API Article ',
]
category_patterns = [
    r'^E2[Ee] Category ',
    r'^Catalog Category ',
]
subject_patterns = [
    r'^E2[eE] subject ',
    r'^Catalog subject ',
]
work_type_patterns = [
    r'^E2[eE] work type ',
    r'^Catalog work type ',
]

def delete_by_patterns(model, field_name, patterns):
    for pattern in patterns:
        model.objects.filter(**{f'{field_name}__iregex': pattern}).delete()

fallback_category = SubjectCategory.objects.exclude(name__iregex=TEST_CATEGORY_REGEX).order_by('id').first()
fallback_subject = Subject.objects.exclude(name__iregex=TEST_SUBJECT_REGEX).order_by('id').first()
fallback_work_type = WorkType.objects.exclude(name__iregex=TEST_WORK_TYPE_REGEX).order_by('id').first()

# Preserve user-visible content that accidentally points at test catalog data.
if fallback_subject:
    Order.objects.exclude(title__iregex=TEST_ORDER_REGEX).filter(subject__name__iregex=TEST_SUBJECT_REGEX).update(subject=fallback_subject)
    Article.objects.filter(subject__iregex=TEST_SUBJECT_REGEX).update(subject=fallback_subject.name)

if fallback_work_type:
    Order.objects.exclude(title__iregex=TEST_ORDER_REGEX).filter(work_type__name__iregex=TEST_WORK_TYPE_REGEX).update(work_type=fallback_work_type)
    Article.objects.filter(work_type__iregex=TEST_WORK_TYPE_REGEX).update(work_type=fallback_work_type.name)

if fallback_category:
    Question.objects.exclude(title__iregex=TEST_QUESTION_REGEX).filter(category__iregex=TEST_CATEGORY_REGEX).update(category=fallback_category.name)

# Remove objects that tests create directly.
delete_by_patterns(Order, 'title', order_patterns)
delete_by_patterns(Article, 'title', article_patterns)
delete_by_patterns(Question, 'title', question_patterns)

# Remove seeded users last among user-owned objects; cascades clean residual related rows.
User.objects.filter(email__iendswith='@e2e.local').delete()

# Remove catalog noise after dependent orders/articles are gone.
delete_by_patterns(WorkType, 'name', work_type_patterns)
delete_by_patterns(Subject, 'name', subject_patterns)
delete_by_patterns(SubjectCategory, 'name', category_patterns)

print('cleanup-ok')
`.trim();
}

export function cleanupE2EData() {
  const cleanupScript = buildCleanupScript();

  try {
    execFileSync('docker', [
      'exec',
      'okoznaniy-backend-1',
      'python',
      'manage.py',
      'shell',
      '-c',
      cleanupScript,
    ], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: 'pipe',
    });
    return;
  } catch {
    const baseEnv = {
      ...process.env,
      ...LOCAL_DJANGO_ENV,
    };

    execFileSync('python', ['manage.py', 'shell', '-c', cleanupScript], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      env: baseEnv,
      stdio: 'pipe',
    });
  }
}
