import { execSync } from 'child_process';
import path from 'path';

const apiRoot = path.resolve(__dirname, '../..');

export function setup() {
  execSync('npx prisma db push --force-reset --skip-generate', {
    cwd: apiRoot,
    env: { ...process.env, DATABASE_URL: 'file:./prisma/test.db' },
    stdio: 'pipe',
  });
}
