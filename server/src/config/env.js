import { z } from 'zod';

const envSchema = z
  .object({
    PORT: z.coerce.number().int().positive().default(5000),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    CORS_ORIGIN: z.string().default('http://localhost:5173'),
    SESSION_TTL_HOURS: z.coerce.number().int().positive().default(72),
    DEV_OTP: z.string().default('123456'),

    // MySQL configuration
    MYSQL_HOST: z.string().default('127.0.0.1'),
    MYSQL_PORT: z.coerce.number().int().positive().default(3306),
    MYSQL_DATABASE: z.string().min(1, 'MYSQL_DATABASE is required'),
    MYSQL_USER: z.string().min(1, 'MYSQL_USER is required'),
    MYSQL_PASSWORD: z.string().min(1, 'MYSQL_PASSWORD is required'),
    MYSQL_SSL: z.preprocess(
      (val) => (typeof val === 'string' ? val.toLowerCase() === 'true' : Boolean(val)),
      z.boolean().default(false)
    ),
    MYSQL_SSL_CA: z.string().optional(),

    // MongoDB configuration
    MONGO_URI: z.string().optional(),
    MONGO_HOST: z.string().default('127.0.0.1'),
    MONGO_PORT: z.coerce.number().int().positive().default(27017),
    MONGO_DB: z.string().min(1, 'MONGO_DB is required'),
    MONGO_APP_USER: z.string().optional(),
    MONGO_APP_PASSWORD: z.string().optional(),

    // Upload configuration
    UPLOAD_DIR: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // 1. When MONGO_URI is not set, require user and password
    if (!data.MONGO_URI) {
      if (!data.MONGO_APP_USER) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'MONGO_APP_USER is required when MONGO_URI is not set',
          path: ['MONGO_APP_USER'],
        });
      }
      if (!data.MONGO_APP_PASSWORD) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'MONGO_APP_PASSWORD is required when MONGO_URI is not set',
          path: ['MONGO_APP_PASSWORD'],
        });
      }
    }

    // 2. Production safety checks
    if (data.NODE_ENV === 'production') {
      if (!process.env.DEV_OTP || data.DEV_OTP === '123456') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'In production, DEV_OTP must be set and cannot be 123456',
          path: ['DEV_OTP'],
        });
      }

      let isHttps = false;
      try {
        const url = new URL(data.CORS_ORIGIN);
        isHttps = url.protocol === 'https:';
      } catch {
        isHttps = false;
      }

      if (!isHttps) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'In production, CORS_ORIGIN must be a valid https URL',
          path: ['CORS_ORIGIN'],
        });
      }
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('\n❌ Fatal: Server environment configuration validation failed:');
  for (const issue of parsed.error.issues) {
    console.error(`   • ${issue.path.join('.') || 'root'}: ${issue.message}`);
  }
  console.error('\nCheck your .env file against .env.example.\n');
  process.exit(1);
}

export const env = parsed.data;
