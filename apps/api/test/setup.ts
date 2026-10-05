import 'reflect-metadata';
import { jest } from '@jest/globals';

// Never evaluate env.ts: it searches for operator files before reading any settings.
jest.mock('../src/env.ts', () => ({
  requireEnv: (name: string) => {
    const value = process.env[name];
    if (!value) throw new Error(`Missing test setting: ${name}`);
    return value;
  },
}));
jest.mock('../src/prisma/client.ts', () => ({
  getPrisma: jest.fn(async () => { throw new Error('Inject a fake Prisma dependency in tests'); }),
  resetPrismaCache: jest.fn(),
}));
process.env.NODE_ENV = 'test';
process.env.PUBLIC_ORIGIN = 'https://example.test';
process.env.MASTER_KEY = Buffer.alloc(32, 1).toString('base64');
delete process.env.DATABASE_URL;
delete process.env.APP_SECRET_ID;
