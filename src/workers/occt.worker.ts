import { parentPort, workerData } from 'worker_threads';
import occtImport from 'occt-import-js';

(async () => {
  try {
    const occt = await occtImport();
    const { data } = workerData as { data: Uint8Array };
    const result = occt.ReadStepFile(data, null);
    parentPort?.postMessage(result);
  } catch (error) {
    parentPort?.postMessage({ error: (error as Error).message });
  }
})(); 