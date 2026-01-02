import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

export interface DatabaseConfig {
  host: string;
  user: string;
  password: string;
  database: string;
  port: number;
  waitForConnections: boolean;
  connectionLimit: number;
  queueLimit: number;
}

const config: DatabaseConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "volxaiuser",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "volxai_db",
  port: parseInt(process.env.DB_PORT || "3306", 10),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// Log database configuration (without password for security)
console.log("📊 Database Configuration:");
console.log(`   Host: ${config.host}:${config.port}`);
console.log(`   User: ${config.user}`);
console.log(`   Database: ${config.database}`);
console.log("   Using environment variables from .env file");

let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (!pool) {
    try {
      pool = mysql.createPool(config);
      console.log("✓ Database pool created successfully");
    } catch (error) {
      console.error("✗ Failed to create database pool:", error);
      throw error;
    }
  }
  return pool;
}

export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const connection = await getPool().getConnection();
    await connection.ping();
    connection.release();
    console.log("✓ Database connection successful");
    return true;
  } catch (error) {
    console.error("✗ Database connection failed!");
    if (error instanceof Error) {
      console.error("   Error:", error.message);
      console.error("   Code:", (error as any).code);

      // Provide helpful debugging info
      if ((error as any).code === "PROTOCOL_CONNECTION_LOST") {
        console.error(
          "   💡 Tip: Connection lost. Check if database server is running.",
        );
      } else if ((error as any).code === "PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR") {
        console.error("   💡 Tip: Fatal error occurred. Check credentials.");
      } else if ((error as any).code === "ER_ACCESS_DENIED_FOR_USER") {
        console.error(
          "   💡 Tip: Access denied. Check DB_USER and DB_PASSWORD in .env",
        );
      } else if ((error as any).code === "ER_BAD_DB_ERROR") {
        console.error("   💡 Tip: Database not found. Check DB_NAME in .env");
      }
    }
    return false;
  }
}

export async function query<T = any>(
  sql: string,
  values?: any[],
): Promise<T[]> {
  const connection = await getPool().getConnection();
  try {
    const [results] = await connection.execute(sql, values);
    return results as T[];
  } finally {
    connection.release();
  }
}

export async function queryOne<T = any>(
  sql: string,
  values?: any[],
): Promise<T | null> {
  const results = await query<T>(sql, values);
  return results.length > 0 ? results[0] : null;
}

export async function execute(sql: string, values?: any[]): Promise<any> {
  const connection = await getPool().getConnection();
  try {
    const result = await connection.execute(sql, values);
    return result[0];
  } finally {
    connection.release();
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log("✓ Database pool closed");
  }
}
