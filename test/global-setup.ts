import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as dotenv from 'dotenv';

export default function globalSetup(): void {
  dotenv.config({ path: path.resolve(__dirname, '.env.test'), override: true });

  const migrationsDir = path.resolve(__dirname, '..', 'prisma', 'migrations');
  const hasMigrations =
    fs.existsSync(migrationsDir) &&
    fs
      .readdirSync(migrationsDir)
      .some((entry) => entry !== 'migration_lock.toml');

  const command = hasMigrations
    ? 'npx prisma migrate deploy'
    : 'npx prisma db push --skip-generate --accept-data-loss';

  execSync(command, { stdio: 'inherit', env: process.env });
}
