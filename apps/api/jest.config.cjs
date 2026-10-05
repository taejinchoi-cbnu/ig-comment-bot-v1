/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.test.ts', '<rootDir>/test/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
    // @nestjs/jwt 12 ships ESM; convert only that dependency for this CJS runner.
    '^.+\\.js$': ['ts-jest', { tsconfig: { allowJs: true, checkJs: false, module: 'CommonJS', target: 'ES2023', esModuleInterop: true, isolatedModules: true } }],
  },
  transformIgnorePatterns: [
    '/node_modules/\\.pnpm/(?!@nestjs\\+jwt@)',
    '/node_modules/(?!\\.pnpm/|@nestjs/jwt/)',
  ],
  resolver: '<rootDir>/test/resolver.cjs',
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  restoreMocks: true,
  coverageProvider: 'v8',
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.test.ts', '!src/**/*.dbtest.ts', '!src/**/*.d.ts', '!src/generated/**'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'html', 'lcov', 'json-summary'],
};
