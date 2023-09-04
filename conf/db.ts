import mysql, { Pool, PoolConnection } from 'mysql2/promise'; // Import the mysql2 library

export const pool: Pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'userinfo',
  connectionLimit: 10,
});


export function executeQuery(query: string, values: any[]): Promise<any> {
  return new Promise(async (resolve, reject) => {
    let connection: PoolConnection | null = null;

    try {
      connection = await pool.getConnection(); // Acquire a connection from the pool

      const [rows] = await connection.query(query, values); // Execute the query

      resolve(rows);
    } catch (error) {
      console.error('Error executing the query:', error);
      reject(error);
    } finally {
      if (connection) {
        connection.release(); // Release the connection back to the pool
      }
    }
  });
}
