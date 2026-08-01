function parseContent(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function mapResource(row) {
  return {
    id: row.id,
    slug: row.slug,
    categoryCode: row.category_code,
    title: row.title,
    summary: row.summary,
    content: parseContent(row.content_json),
    sourceUrl: row.source_url,
    sourceLabel: row.source_label,
    displayOrder: row.display_order,
  };
}

module.exports = {
  mapResource,
  parseContent,
};
