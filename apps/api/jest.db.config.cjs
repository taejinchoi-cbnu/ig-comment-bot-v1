const base = require('./jest.config.cjs');
if (!process.env.TEST_DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL is required; use a separate test database');
}
/** @type {import('jest').Config} */
module.exports = { ...base, testMatch: ['<rootDir>/src/**/*.dbtest.ts'], setupFilesAfterEnv: [], testTimeout: 30_000 };
