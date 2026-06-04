import { env } from "./config/env.js";
import { initDatabase, pool } from "./db/pool.js";
import { createApp } from "./app.js";

async function bootstrap() {
  await initDatabase();

  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`Starxia chatbot server listening on port ${env.port}`);
  });

  const shutdown = async () => {
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

bootstrap().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
