export function splitText(text, chunkSize = 500, overlap = 50) {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    let end = start + chunkSize;
    const chunk = text.slice(start, end).trim();

    if (chunk) chunks.push(chunk);

    start += chunkSize - overlap;
  }

  return chunks;
}
