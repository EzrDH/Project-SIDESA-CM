import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Minimal .env loader (no extra dependency) so PrismaClient sees DATABASE_URL in tests.
try {
  const envPath = fileURLToPath(new URL('./.env', import.meta.url));
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!(m[1] in process.env)) process.env[m[1]] = v;
  }
} catch {
  // no .env present; rely on the real environment
}
