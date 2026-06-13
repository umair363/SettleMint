import { copyFileSync } from 'fs';

const src = 'C:\\Users\\user\\.gemini\\antigravity\\brain\\b1bb5231-f2e8-4eed-8cee-5aae55027729';
const dest = 'b:\\Settle-Mint\\app\\public\\images';

try {
  copyFileSync(`${src}\\hero_illustration_1781383237330.png`, `${dest}\\hero.png`);
  console.log('Copied hero.png');
} catch(e) { console.error(e.message); }

try {
  copyFileSync(`${src}\\feature_receipt_1781383258244.png`, `${dest}\\feature-receipt.png`);
  console.log('Copied feature-receipt.png');
} catch(e) { console.error(e.message); }

try {
  copyFileSync(`${src}\\feature_settlement_1781383270385.png`, `${dest}\\feature-settlement.png`);
  console.log('Copied feature-settlement.png');
} catch(e) { console.error(e.message); }
