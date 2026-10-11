import { getDiff, getDiffOptions } from './diff.js';

const options = getDiffOptions();
const diff = getDiff(options);

console.log(`Comparing ${options.base}...${options.head}`);
console.log(diff);