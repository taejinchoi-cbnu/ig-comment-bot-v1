import { afterEach, beforeEach, expect, test } from '@jest/globals';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import resolver from './resolver.cjs';

let directory: string;
let options: Parameters<typeof resolver>[1];
beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'ig-jest-resolver-'));
  const require = createRequire(join(directory, 'entry.cjs'));
  options = { defaultResolver: request => require.resolve(request) };
});
afterEach(() => { rmSync(directory, { recursive: true, force: true }); });

test('real JavaScript takes precedence when a matching TypeScript file also exists', () => {
  writeFileSync(join(directory, 'module.js'), 'module.exports = 1;');
  writeFileSync(join(directory, 'module.ts'), 'export const value = 2;');
  expect(resolver('./module.js', options)).toBe(join(directory, 'module.js'));
});
test('missing relative JavaScript resolves to the existing TypeScript source', () => {
  writeFileSync(join(directory, 'module.ts'), 'export const value = 2;');
  expect(resolver('./module.js', options)).toBe(join(directory, 'module.ts'));
});
test('missing source preserves the original resolution error and builtins are untouched', () => {
  let original: unknown;
  try { options.defaultResolver('./missing.js', options); } catch (error) { original = error; }
  expect(() => resolver('./missing.js', options)).toThrow((original as Error).message);
  expect(resolver('node:fs', options)).toBe('node:fs');
});
