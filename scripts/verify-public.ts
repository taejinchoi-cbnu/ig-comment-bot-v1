import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// Scan tracked files, never operator files. Report locations without matched values.
const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const forbidden = /^(?:ops|node_modules|\.aws|\.agents|\.codex|\.git)(?:\/|$)|(?:^|\/)(?:dist|dist-lambda|generated)\/|(?:^|\/)\.env(?:\.|$)(?!example$)|\.(?:pem|key)$/;
const secrets = [
  /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/,
  /\b(?:IGAA|IGQ|EAA)[A-Za-z0-9_-]{30,}/,
  /\b(?:gh[pousr]_|github_pat_)[A-Za-z0-9_]{30,}/,
  /-----BEGIN (?:[A-Z ]+)?PRIVATE KEY-----/,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
];
let issues = 0;
if (!files.some(file => file.startsWith('docs/') && file.endsWith('.md'))) {
  console.error('Public Markdown docs are missing'); issues++;
}
for (const file of files) {
  if (forbidden.test(file) || /^docs\/KakaoTalk_.*\.jpg$/.test(file)) {
    console.error(`Excluded public path: ${file}`); issues++; continue;
  }
  const data = readFileSync(file);
  if (data.includes(0)) continue;
  data.toString('utf8').split('\n').forEach((line, index) => {
    if (secrets.some(pattern => pattern.test(line))) {
      console.error(`Secret pattern: ${file}:${index + 1}`); issues++;
    }
  });
}
if (issues) process.exitCode = 1;
else console.log(`Public boundary and basic secret patterns: ${files.length} tracked files checked`);
