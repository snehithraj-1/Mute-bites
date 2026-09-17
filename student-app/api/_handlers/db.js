import { neon } from '@neondatabase/serverless';
import pg from 'pg';

const { Pool } = pg;

export function getDatabaseUrl() {
  let url = process.env.DATABASE_URL || 
            process.env.POSTGRES_URL || 
            process.env.VITE_DATABASE_URL || 
            'postgresql://postgres:Mutebites%40135@db.pxtizpwijvjzsmripmxy.supabase.co:5432/postgres';

  if (url) {
    url = url.trim();
    if (url.startsWith('DATABASE_URL=')) url = url.replace(/^DATABASE_URL=/, '').trim();
    if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
      url = url.slice(1, -1).trim();
    }
  }
  return url;
}

const DATABASE_URL = getDatabaseUrl();

let poolInstance = null;

export function createUniversalSql(url) {
  if (!url) return null;
  const isSupabaseOrPg = url.includes('supabase.co') || !url.includes('neon.tech');
  if (isSupabaseOrPg) {
    if (!poolInstance) {
      poolInstance = new Pool({
        connectionString: url,
        ssl: { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000
      });
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
    return sqlFunc;
  }
  return neon(url);
}

export const sql = createUniversalSql(DATABASE_URL);
export default sql;
