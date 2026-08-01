function createResourceRepository(pool) {
  function db(connection) {
    return connection || pool;
  }

  async function listPublishedResources(locale = 'en', connection) {
    const [rows] = await db(connection).query(
      `SELECT ra.id,
              ra.slug,
              ra.category_code,
              ra.source_url,
              ra.display_order,
              COALESCE(requested.title, english.title) AS title,
              COALESCE(requested.summary, english.summary) AS summary,
              COALESCE(requested.content_json, english.content_json) AS content_json,
              COALESCE(requested.source_label, english.source_label) AS source_label
       FROM resource_articles ra
       LEFT JOIN resource_article_translations requested
         ON requested.resource_id = ra.id AND requested.locale = ?
       JOIN resource_article_translations english
         ON english.resource_id = ra.id AND english.locale = 'en'
       WHERE ra.status = 'published'
       ORDER BY ra.display_order, ra.id`,
      [locale]
    );
    return rows;
  }

  async function findPublishedBySlug(slug, locale = 'en', connection) {
    const [rows] = await db(connection).query(
      `SELECT ra.id,
              ra.slug,
              ra.category_code,
              ra.source_url,
              ra.display_order,
              COALESCE(requested.title, english.title) AS title,
              COALESCE(requested.summary, english.summary) AS summary,
              COALESCE(requested.content_json, english.content_json) AS content_json,
              COALESCE(requested.source_label, english.source_label) AS source_label
       FROM resource_articles ra
       LEFT JOIN resource_article_translations requested
         ON requested.resource_id = ra.id AND requested.locale = ?
       JOIN resource_article_translations english
         ON english.resource_id = ra.id AND english.locale = 'en'
       WHERE ra.slug = ? AND ra.status = 'published'
       LIMIT 1`,
      [locale, slug]
    );
    return rows[0] || null;
  }

  return {
    findPublishedBySlug,
    listPublishedResources,
  };
}

module.exports = {
  createResourceRepository,
};
