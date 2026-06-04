import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");

const required = ["OPENAI_API_KEY", "DATABASE_URL"];
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const toList = (value) =>
  (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 3000),
  openAiApiKey: process.env.OPENAI_API_KEY,
  openAiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
  openAiPremiumModel: process.env.OPENAI_PREMIUM_MODEL || "gpt-4o",
  databaseUrl: process.env.DATABASE_URL,
  allowedOrigins: toList(process.env.ALLOWED_ORIGINS),
  rawContentPath: path.resolve(projectRoot, process.env.RAW_CONTENT_PATH || "./# RAW para chatbot de atención al cliente.md"),
  chatInactivityMinutes: Number(process.env.CHAT_INACTIVITY_MINUTES || 1440),
  maxHistoryMessages: Number(process.env.MAX_HISTORY_MESSAGES || 12),
  maxInputChars: Number(process.env.MAX_INPUT_CHARS || 2500),
  dbAutoMigrate: `${process.env.DB_AUTO_MIGRATE || "true"}` === "true",
  widgetTitle: process.env.CHAT_WIDGET_TITLE || "Starxist",
  widgetSubtitle: process.env.CHAT_WIDGET_SUBTITLE || "Asesor IA Gratuito",
  projectRoot
};
