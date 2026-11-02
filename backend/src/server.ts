import { createApp } from './app.js';
import { config, assertProductionConfig } from './config/env.js';
import { pool } from './db/pool.js';

async function main(): Promise<void> {
  assertProductionConfig();

  // Kiểm tra kết nối DB sớm, báo lỗi rõ ràng nếu cấu hình sai.
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
  } catch (error) {
    console.error('[server] Không kết nối được PostgreSQL. Kiểm tra DATABASE_URL trong .env.', error);
    process.exit(1);
  }

  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`[server] Làng Mộc API đang chạy tại http://localhost:${config.port}/api/v1`);
  });

  const shutdown = async (signal: string) => {
    console.log(`[server] Nhận ${signal}, đang tắt...`);
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

void main();
