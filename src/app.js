import path from "node:path";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { fileURLToPath } from "node:url";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { createSimpleRateLimiter } from "./middleware/rate-limit.js";
import { chatRouter } from "./routes/chat.js";
import { healthRouter } from "./routes/health.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();

  app.set("trust proxy", true);

  app.use(
    helmet({
      crossOriginResourcePolicy: false
    })
  );
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || env.allowedOrigins.length === 0 || env.allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error("Origin not allowed by CORS"));
      }
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(createSimpleRateLimiter({ maxPerMinute: 25 }));

  app.use(
    "/widget",
    express.static(path.resolve(__dirname, "..", "public"), {
      etag: true,
      maxAge: 0,
      setHeaders(res, filePath) {
        if (filePath.endsWith("chat-widget.js")) {
          res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
          res.setHeader("Pragma", "no-cache");
          res.setHeader("Expires", "0");
        }
      }
    })
  );

  app.use(healthRouter);
  app.use(chatRouter);
  app.use(errorHandler);

  return app;
}
