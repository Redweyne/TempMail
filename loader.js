// ES Module loader for production deployment
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
const envPath = join(__dirname, '.env');

if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
}

// Set production environment
process.env.NODE_ENV = 'production';
process.env.PORT = '5001';
process.env.BASE_PATH = '/tempmail';

// Enable trust proxy for VPS deployment behind reverse proxy
// Use "loopback" to only trust local proxies (nginx on same machine)
// Can be overridden via .env file if needed (e.g., for remote load balancers)
if (!process.env.TRUST_PROXY) {
  process.env.TRUST_PROXY = 'loopback';
}

// Start the application
await import('./dist/index.js');
