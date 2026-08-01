const MAX_CHUNK_CHARACTERS = 1200;

function parseContentJson(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function tokenEstimate(text) {
  return Math.max(1, Math.ceil(normalizeText(text).length / 4));
}

function splitLongText(text) {
  const normalized = normalizeText(text);
  if (!normalized) return [];
  if (normalized.length <= MAX_CHUNK_CHARACTERS) return [normalized];

  const chunks = [];
  let remaining = normalized;
  while (remaining.length > MAX_CHUNK_CHARACTERS) {
    const slice = remaining.slice(0, MAX_CHUNK_CHARACTERS);
    const splitAt = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('。'), slice.lastIndexOf(' '));
    const end = splitAt > 400 ? splitAt + 1 : MAX_CHUNK_CHARACTERS;
    chunks.push(remaining.slice(0, end).trim());
    remaining = remaining.slice(end).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

function contentItemToParts(item) {
  if (typeof item === 'string') return { heading: null, text: item };
  if (!item || typeof item !== 'object') return { heading: null, text: '' };
  return {
    heading: normalizeText(item.heading || item.title || item.label || ''),
    text: normalizeText(item.body || item.text || item.content || item.description || ''),
  };
}

function buildResourceChunks(resource) {
  const chunks = [];
  const pushChunk = (heading, text, kind) => {
    for (const part of splitLongText(text)) {
      chunks.push({
        chunkIndex: chunks.length,
        heading: heading || null,
        chunkText: part,
        tokenEstimate: tokenEstimate(part),
        metadata: { kind },
      });
    }
  };

  const title = normalizeText(resource.title);
  const summary = normalizeText(resource.summary);
  if (title) pushChunk('Title', title, 'title');
  if (summary) pushChunk('Summary', summary, 'summary');

  for (const item of parseContentJson(resource.content_json)) {
    const { heading, text } = contentItemToParts(item);
    if (text) pushChunk(heading || null, text, 'body');
  }

  return chunks;
}

module.exports = {
  buildResourceChunks,
  parseContentJson,
};
