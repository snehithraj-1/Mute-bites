import { neon } from '@neondatabase/serverless';
import pg from 'pg';

const { Pool } = pg;

// Prevent Node TLS certificate chain verification rejection on cloud serverless runtimes
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export const SUPABASE_DIRECT_URL = 'postgresql://postgres.wymxfaheyhvcqyahludl:Mutebites%40123@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres';

export function getDatabaseUrl() {
  let url = process.env.DATABASE_URL || 
            process.env.POSTGRES_URL || 
            process.env.VITE_DATABASE_URL || 
            SUPABASE_DIRECT_URL;

  if (url) {
    url = url.trim();
    if (url.startsWith('DATABASE_URL=')) url = url.replace(/^DATABASE_URL=/, '').trim();
    if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
      url = url.slice(1, -1).trim();
    }
  }

  // If env variable is still set to legacy Neon database on Vercel, direct to active Supabase database
  if (url.includes('neon.tech') || url.includes('db.wymxfaheyhvcqyahludl.supabase.co') || url.includes('pxtizpwijvjzsmripmxy')) {
    url = SUPABASE_DIRECT_URL;
  }

  return url || SUPABASE_DIRECT_URL;
}

const DATABASE_URL = getDatabaseUrl();

let poolInstance = null;

export function createUniversalSql(url) {
  if (!url) return null;
  const isSupabaseOrPg = url.includes('supabase.co') || !url.includes('neon.tech');
  if (isSupabaseOrPg) {
    if (!poolInstance) {
      try {
        const parsed = new URL(url);
        poolInstance = new Pool({
          host: parsed.hostname,
          port: parseInt(parsed.port || '5432', 10),
          user: decodeURIComponent(parsed.username || 'postgres'),
          password: decodeURIComponent(parsed.password || ''),
          database: decodeURIComponent(parsed.pathname.replace(/^\//, '') || 'postgres'),
          ssl: { rejectUnauthorized: false },
          max: 10,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 10000
        });
      } catch (parseErr) {
        poolInstance = new Pool({
          connectionString: url,
          ssl: { rejectUnauthorized: false },
          max: 10,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 10000
        });
      }
    }
    const sqlFunc = async (strings, ...values) => {
      if (Array.isArray(strings)) {
        let query = '';
        for (let i = 0; i < strings.length; i++) {
          query += strings[i];
          if (i < values.length) {
            query += '$' + (i + 1);
          }
        }
        const res = await poolInstance.query(query, values);
        return res.rows;
      }
      const res = await poolInstance.query(strings, values[0]);
      return res.rows;
    };
    sqlFunc.query = async (text, params) => {
      const res = await poolInstance.query(text, params);
      return res.rows;
    };
    sqlFunc.transaction = async (queries) => {
      const client = await poolInstance.connect();
      try {
        await client.query('BEGIN');
        const results = [];
        for (const q of queries) {
          if (typeof q === 'function') {
            results.push(await q(client));
          } else {
            results.push(await client.query(q));
          }
        }
        await client.query('COMMIT');
        return results;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    };
    return sqlFunc;
  }
  return neon(url);
}

export const sql = createUniversalSql(DATABASE_URL);
export default sql;
