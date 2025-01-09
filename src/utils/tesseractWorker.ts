import { createWorker } from 'tesseract.js';
import path from 'path';

export async function initializeWorker() {
  const worker = await createWorker({
    logger: m => console.log(m),
    errorHandler: e => console.error('Worker error:', e),
  });
  
  await worker.loadLanguage('eng');
  await worker.initialize('eng');
  await worker.setParameters({
    tessedit_char_whitelist: '0123456789ABCDEFGHJKLMNPRSTUVWXYZ'
  });
  
  return worker;
} 