/**
 * Chạy bộ test backend và ghi kết quả UTF-8 vào docs/evidence/backend/test-results.txt
 * Chạy: node scripts/capture_test_results.mjs
 */
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(here, '..', 'backend');
const outFile = path.resolve(here, '..', 'docs', 'evidence', 'backend', 'test-results.txt');

const child = spawn(process.execPath, [path.join(backendDir, 'node_modules', 'tsx', 'dist', 'cli.mjs'), '--test', 'tests/auth.test.ts', 'tests/catalog.test.ts'], {
  cwd: backendDir,
  env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let output = '';
child.stdout.setEncoding('utf8');
child.stderr.setEncoding('utf8');
child.stdout.on('data', (chunk) => {
  output += chunk;
  process.stdout.write(chunk);
});
child.stderr.on('data', (chunk) => {
  output += chunk;
  process.stderr.write(chunk);
});

child.on('exit', async (code) => {
  const header = `Làng Mộc — kết quả test backend\nSinh lúc: ${new Date().toISOString()}\nMôi trường: Node ${process.version}, PostgreSQL 16 local\nLệnh: npm test (tsx --test tests/*.test.ts)\nExit code: ${code}\n${'='.repeat(78)}\n\n`;
  await writeFile(outFile, header + output, 'utf8');
  console.log(`\nĐã ghi ${outFile}`);
  process.exit(code ?? 0);
});
