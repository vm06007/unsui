const { Pool } = require('pg');

// No connection string or signed transaction bytes should appear in logs.
function createPostgresStore({ connectionString = process.env.DATABASE_URL, pool } = {}) {
  if (!pool && !connectionString) throw Error('DATABASE_URL is required');
  const database = pool || new Pool({ connectionString, max: 3, connectionTimeoutMillis: 10000 });

  async function migrate() {
    await database.query(`
      CREATE TABLE IF NOT EXISTS unsui_documents (
        namespace text NOT NULL,
        key text NOT NULL,
        value jsonb NOT NULL,
        version bigint NOT NULL DEFAULT 1,
        updated_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (namespace, key)
      );
      CREATE TABLE IF NOT EXISTS unsui_payout_requests (
        request_id text PRIMARY KEY,
        card_scope text NOT NULL UNIQUE,
        binding text NOT NULL,
        input jsonb NOT NULL,
        result jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
  }

  async function read(namespace, key) {
    const { rows } = await database.query(
      'SELECT value, version FROM unsui_documents WHERE namespace = $1 AND key = $2',
      [namespace, key],
    );
    return rows[0] || null;
  }

  // Compare-and-swap prevents two function instances from overwriting each other.
  async function write(namespace, key, value, expectedVersion = null) {
    const parameters = [namespace, key, JSON.stringify(value)];
    const result = expectedVersion === null
      ? await database.query(`INSERT INTO unsui_documents (namespace, key, value)
          VALUES ($1, $2, $3::jsonb) ON CONFLICT DO NOTHING RETURNING version`, parameters)
      : await database.query(`UPDATE unsui_documents SET value = $3::jsonb,
          version = version + 1, updated_at = now()
          WHERE namespace = $1 AND key = $2 AND version = $4 RETURNING version`,
        [...parameters, expectedVersion]);
    if (!result.rowCount) throw Error('Stored state changed; reload before retrying');
    return result.rows[0].version;
  }

  function journal(namespace) {
    return {
      async get(key) {
        return (await read(namespace, key))?.value || null;
      },
      async put(key, value) {
        await database.query(`INSERT INTO unsui_documents (namespace, key, value)
          VALUES ($1, $2, $3::jsonb) ON CONFLICT DO NOTHING`,
        [namespace, key, JSON.stringify(value)]);
        const existing = await read(namespace, key);
        // JSONB canonicalizes key order, so compare inside Postgres.
        const { rows } = await database.query(`SELECT value = $3::jsonb AS matches
          FROM unsui_documents WHERE namespace = $1 AND key = $2`,
        [namespace, key, JSON.stringify(value)]);
        if (!existing || !rows[0]?.matches) throw Error('Transaction journal conflict');
      },
    };
  }

  // A reservation survives function termination and is never released on timeout.
  // A new round must use a new card_scope; retry the original request otherwise.
  async function reserve({ requestId, cardScope, binding, input }) {
    await database.query(`INSERT INTO unsui_payout_requests
      (request_id, card_scope, binding, input) VALUES ($1, $2, $3, $4::jsonb)
      ON CONFLICT DO NOTHING`, [requestId, cardScope, binding, JSON.stringify(input)]);
    const { rows } = await database.query(
      'SELECT * FROM unsui_payout_requests WHERE request_id = $1', [requestId],
    );
    const row = rows[0];
    if (!row || row.card_scope !== cardScope || row.binding !== binding)
      throw Error('Card or request already reserved for a different payout');
    return row;
  }

  async function complete(requestId, binding, result) {
    const response = await database.query(`UPDATE unsui_payout_requests
      SET result = $3::jsonb, updated_at = now()
      WHERE request_id = $1 AND binding = $2 AND (result IS NULL OR result = $3::jsonb)
      RETURNING result`, [requestId, binding, JSON.stringify(result)]);
    if (!response.rowCount) throw Error('Payout result conflicts with its reservation');
    return response.rows[0].result;
  }

  async function coordinate(work) {
    const connection = await database.connect();
    try {
      await connection.query('BEGIN');
      // Transaction-scoped locks also work with Neon's transaction pooler.
      const { rows } = await connection.query('SELECT pg_try_advisory_xact_lock(782934, 1) AS locked');
      if (!rows[0].locked) throw Error('Another refund or verification is processing. Please retry shortly.');
      const state = {
        async get(key) {
          const result = await connection.query(
            "SELECT value FROM unsui_documents WHERE namespace = 'runtime' AND key = $1", [key]);
          return result.rows[0]?.value ?? null;
        },
        async set(key, value) {
          await connection.query(`INSERT INTO unsui_documents (namespace, key, value)
            VALUES ('runtime', $1, $2::jsonb) ON CONFLICT (namespace, key)
            DO UPDATE SET value = EXCLUDED.value, version = unsui_documents.version + 1, updated_at = now()`,
          [key, JSON.stringify(value)]);
        },
      };
      const result = await work(state);
      await connection.query('COMMIT');
      return result;
    } catch (error) {
      await connection.query('ROLLBACK').catch(() => {});
      throw error;
    } finally { connection.release(); }
  }

  async function pending() {
    const { rows } = await database.query('SELECT request_id FROM unsui_payout_requests WHERE result IS NULL ORDER BY created_at LIMIT 1');
    return rows[0]?.request_id || null;
  }

  return { migrate, read, write, journal, reserve, complete, coordinate, pending, close: () => database.end() };
}

module.exports = { createPostgresStore };
