import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanupE2EData } from './helpers/cleanup';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AUTH_DIR = path.resolve(__dirname, '.auth');

export default async function globalTeardown() {
  cleanupE2EData();
  fs.rmSync(AUTH_DIR, { recursive: true, force: true });
}
