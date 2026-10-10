import { formatReview } from './format.js';
import type { Finding } from './types.js';

const findings: Finding[] = [
    { file: 'src/login.ts', line: 42, severity: 'error', message: 'Password is hardcoded.' },
    { file: 'src/api.ts', severity: 'error', message: 'Missing error handling.' },
    { file: 'src/utils.ts', line: 7, severity: 'warning', message: 'Loop may skip the last element.' },
];

console.log(formatReview(findings));
console.log('---');
console.log(formatReview([]));