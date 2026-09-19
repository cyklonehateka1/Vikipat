import { config } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';

const candidates = [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), 'apps/api/.env'),
];

const envPath = candidates.find((candidate) => existsSync(candidate));
if (envPath) {
  config({
    path: envPath,
    // Local shells can contain empty placeholders. The project-local file is
    // authoritative in development; deployed secrets remain authoritative.
    override: process.env.NODE_ENV !== 'production',
  });
}
