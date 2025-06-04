export const withRetry = async (fn, retries = 3, delay = 1000, label = '') => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      console.warn(`Attempt ${i + 1} failed for ${label || 'task'}: ${e.message}`);
      if (i === retries - 1) throw e;
      await new Promise(res => setTimeout(res, delay * (i + 1)));
    }
  }
};

let buffer = [];

export const saveChunk = (chunk, worksheet, chunkSize = 100) => {
  buffer.push(...chunk);
  if (buffer.length >= chunkSize) {
    console.log(`Writing ${buffer.length} rows to worksheet...`);
    buffer.forEach(row => worksheet.addRow(row));
    buffer = [];
  }
};
