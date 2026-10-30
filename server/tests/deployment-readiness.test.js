import { describe, test, expect } from '@jest/globals';
import { execFile } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SERVER_ROOT = path.resolve(__dirname, '..');

function runEnvCheck(envOverrides) {
  return new Promise((resolve) => {
    // Run a small script that imports env.js with controlled environment variables
    const script = `import('./src/config/env.js').then(() => console.log('ENV_OK')).catch(e => console.error(e));`;
    execFile(
      process.execPath,
      ['--input-type=module', '-e', script],
      {
        cwd: SERVER_ROOT,
        env: {
          ...process.env,
          ...envOverrides,
        },
      },
      (error, stdout, stderr) => {
        resolve({
          exitCode: error ? error.code || 1 : 0,
          stdout: stdout.toString(),
          stderr: stderr.toString(),
        });
      }
    );
  });
}

describe('Deployment Readiness Configuration', () => {
  describe('Production Environment Guards (env.js)', () => {
    test('refuses to start in production if DEV_OTP equals 123456', async () => {
      const res = await runEnvCheck({
        NODE_ENV: 'production',
        DEV_OTP: '123456',
        CORS_ORIGIN: 'https://rentify.example.com',
      });

      expect(res.exitCode).not.toBe(0);
      expect(res.stderr).toContain('DEV_OTP must be set and cannot be 123456');
    });

    test('refuses to start in production if CORS_ORIGIN is not an https URL', async () => {
      const res = await runEnvCheck({
        NODE_ENV: 'production',
        DEV_OTP: 'secure_prod_otp_9821',
        CORS_ORIGIN: 'http://rentify.example.com',
      });

      expect(res.exitCode).not.toBe(0);
      expect(res.stderr).toContain('CORS_ORIGIN must be a valid https URL');
    });

    test('accepts valid production configuration with secure DEV_OTP and https CORS_ORIGIN', async () => {
      const res = await runEnvCheck({
        NODE_ENV: 'production',
        DEV_OTP: 'secure_prod_otp_9821',
        CORS_ORIGIN: 'https://rentify.example.com',
      });

      expect(res.exitCode).toBe(0);
      expect(res.stdout).toContain('ENV_OK');
    });
  });

  describe('MongoDB MONGO_URI support', () => {
    test('allows omitting MONGO_APP_USER and MONGO_APP_PASSWORD when MONGO_URI is set', async () => {
      const cleanEnv = { ...process.env };
      delete cleanEnv.MONGO_APP_USER;
      delete cleanEnv.MONGO_APP_PASSWORD;

      const res = await runEnvCheck({
        NODE_ENV: 'development',
        MONGO_URI: 'mongodb+srv://atlas_user:atlas_pass@cluster.mongodb.net/rentify?retryWrites=true',
        MONGO_APP_USER: '',
        MONGO_APP_PASSWORD: '',
      });

      expect(res.exitCode).toBe(0);
      expect(res.stdout).toContain('ENV_OK');
    });

    test('requires MONGO_APP_USER and MONGO_APP_PASSWORD when MONGO_URI is missing', async () => {
      const res = await runEnvCheck({
        NODE_ENV: 'development',
        MONGO_URI: '',
        MONGO_APP_USER: '',
        MONGO_APP_PASSWORD: '',
      });

      expect(res.exitCode).not.toBe(0);
      expect(res.stderr).toContain('MONGO_APP_USER is required when MONGO_URI is not set');
    });
  });

  describe('Uploads Directory Configuration', () => {
    test('resolves custom UPLOAD_DIR when specified', async () => {
      const customPath = path.join(os.tmpdir(), 'rentify_custom_uploads');
      const script = `
        import { UPLOADS_DIR } from './src/services/storage.service.js';
        console.log('DIR:' + UPLOADS_DIR);
      `;

      const result = await new Promise((resolve) => {
        execFile(
          process.execPath,
          ['--input-type=module', '-e', script],
          {
            cwd: SERVER_ROOT,
            env: {
              ...process.env,
              UPLOAD_DIR: customPath,
            },
          },
          (err, stdout) => {
            resolve(stdout.toString());
          }
        );
      });

      expect(result).toContain('DIR:' + path.resolve(customPath));
    });
  });

  describe('Trust Proxy Setting in app.js', () => {
    test('enables trust proxy when NODE_ENV is production', async () => {
      const script = `
        process.env.NODE_ENV = 'production';
        process.env.DEV_OTP = 'secure_test_otp_441';
        process.env.CORS_ORIGIN = 'https://app.rentify.example';
        const { app } = await import('./src/app.js');
        console.log('TRUST_PROXY:' + app.get('trust proxy'));
      `;

      const result = await new Promise((resolve) => {
        execFile(
          process.execPath,
          ['--input-type=module', '-e', script],
          {
            cwd: SERVER_ROOT,
            env: {
              ...process.env,
              NODE_ENV: 'production',
              DEV_OTP: 'secure_test_otp_441',
              CORS_ORIGIN: 'https://app.rentify.example',
            },
          },
          (err, stdout) => {
            resolve(stdout.toString());
          }
        );
      });

      expect(result).toContain('TRUST_PROXY:1');
    });
  });
});
