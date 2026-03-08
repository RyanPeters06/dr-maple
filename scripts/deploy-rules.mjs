#!/usr/bin/env node
import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const envPath = join(root, '.env');

let projectId = process.env.VITE_FIREBASE_PROJECT_ID;
if (!projectId && existsSync(envPath)) {
  const env = readFileSync(envPath, 'utf8');
  const m = env.match(/VITE_FIREBASE_PROJECT_ID=(.+)/);
  if (m) projectId = m[1].trim().replace(/^["']|["']$/g, '');
}

if (!projectId) {
  console.error('Missing Firebase project ID. Either:');
  console.error('  1. Set VITE_FIREBASE_PROJECT_ID in .env (same as in your app config), or');
  console.error('  2. Run: npx firebase use --add  (then run this script again)');
  process.exit(1);
}

console.log('Deploying Firestore rules to project:', projectId);
execSync(`npx firebase deploy --only firestore:rules --project "${projectId}"`, {
  cwd: root,
  stdio: 'inherit',
});
