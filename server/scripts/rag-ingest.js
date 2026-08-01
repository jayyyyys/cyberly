const { createPool } = require('../src/database/pool');
const { createRagRepository } = require('../src/rag/rag.repository');
const { createRagService } = require('../src/rag/rag.service');

async function run() {
  const pool = createPool();
  try {
    const repository = createRagRepository(pool);
    const service = createRagService(repository);
    const result = await service.ingestPublishedResources();
    console.log(`RAG resource ingestion complete. Documents: ${result.documents}. Chunks written: ${result.chunks}.`);
  } finally {
    await pool.end();
  }
}

run().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
