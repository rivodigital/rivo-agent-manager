export function calculateDelay(text) {
  const len = typeof text === "string" ? text.length : 0;
  return Math.min(Math.max(len * 20, 1000), 4000);
}

export function splitMessage(text) {
  const MAX_CHUNK = 350;
  const HARD_MAX = 400;
  const MIN_CHUNK = 20;
  const GROUP_THRESHOLD = 80;

  if (text.length <= MAX_CHUNK) return [text];

  let chunks = [];

  // 1. Split by double newlines (paragraphs)
  let parts = text.split(/\n\n+/);

  // 2. For chunks still too large, split by single newline
  let refined = [];
  for (const part of parts) {
    if (part.length > MAX_CHUNK) {
      refined.push(...part.split(/\n+/));
    } else {
      refined.push(part);
    }
  }
  parts = refined;

  // 3. For chunks still too large, split by last ". " before HARD_MAX
  refined = [];
  for (const part of parts) {
    if (part.length > HARD_MAX) {
      let remaining = part;
      while (remaining.length > HARD_MAX) {
        const slice = remaining.slice(0, HARD_MAX);
        const lastDot = slice.lastIndexOf(". ");
        if (lastDot > MIN_CHUNK) {
          refined.push(remaining.slice(0, lastDot + 2));
          remaining = remaining.slice(lastDot + 2);
        } else {
          // Fallback: hard split at HARD_MAX
          refined.push(slice);
          remaining = remaining.slice(HARD_MAX);
        }
      }
      if (remaining.length > 0) refined.push(remaining);
    } else {
      refined.push(part);
    }
  }
  parts = refined;

  // 4. Filter out tiny chunks (< MIN_CHUNK) by merging into neighbors
  let filtered = [];
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.length < MIN_CHUNK && filtered.length > 0) {
      filtered[filtered.length - 1] += "\n\n" + trimmed;
    } else if (trimmed.length >= MIN_CHUNK) {
      filtered.push(trimmed);
    } else if (trimmed.length > 0) {
      filtered.push(trimmed);
    }
  }
  chunks = filtered;

  // 5. Group small consecutive chunks (< GROUP_THRESHOLD) together
  const grouped = [];
  let accumulator = "";
  for (const chunk of chunks) {
    if (chunk.length < GROUP_THRESHOLD) {
      accumulator = accumulator ? accumulator + "\n\n" + chunk : chunk;
      if (accumulator.length >= GROUP_THRESHOLD) {
        grouped.push(accumulator);
        accumulator = "";
      }
    } else {
      if (accumulator) {
        grouped.push(accumulator);
        accumulator = "";
      }
      grouped.push(chunk);
    }
  }
  if (accumulator) grouped.push(accumulator);

  return grouped.length > 0 ? grouped : chunks;
}
