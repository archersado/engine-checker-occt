import { parentPort, workerData } from 'worker_threads';
import occtImport from 'occt-import-js';

(async () => {
  try {
    const occt = await occtImport();
    const { data } = workerData as { data: Uint8Array };
    const result = occt.ReadStepFile(data, {
      linearDeflection: 0.1,
      angularDeflection: 0.0175
    });
    console.log(result)
    parentPort?.postMessage(result);
  } catch (error) {
    console.log(error)
    parentPort?.postMessage({ error: (error as Error).message });
  }
})(); 