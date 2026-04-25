import { parentPort, workerData } from 'worker_threads';
import { join } from 'path';

const occtPath = join(__dirname, '../occt', 'occt-import-js.js');
const occtImport = require(occtPath);

(async () => {
  try {
    const occt = await occtImport();
    const { data } = workerData as { data: Uint8Array };
    const result = occt.ReadStepFile(data, {
      linearDeflection: 0.2,
      angularDeflection: 0.05,
    });
    parentPort?.postMessage(result);
  } catch (error) {
    parentPort?.postMessage({ error: (error as Error).message });
  }
})(); 