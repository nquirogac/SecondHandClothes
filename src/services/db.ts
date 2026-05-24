import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://user:pass@localhost:5432/marketplace",
});

export async function insertComment(
  itemId: string,
  userId: string,
  username: string,
  text: string,
) {
  const query = `
    INSERT INTO comments (id, item_id, user_id, username, text, created_at)
    VALUES ($1, $2, $3, $4, $5, NOW())
    RETURNING *;
  `;
  const id = "com_" + Date.now();
  const result = await pool.query(query, [id, itemId, userId, username, text]);
  return result.rows[0];
}

export async function findUserByLoginField(loginField: string, value: string) {
  const query = `SELECT * FROM users WHERE ${loginField} = $1 LIMIT 1;`;
  const result = await pool.query(query, [value]);
  return result.rows[0];
}
