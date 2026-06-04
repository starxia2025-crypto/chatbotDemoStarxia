import OpenAI from "openai";
import { env } from "../config/env.js";
import { sanitizeText } from "../lib/sanitize.js";
import { buildSystemPrompt, buildUserPrompt } from "./prompt-service.js";
import {
  appendMessage,
  getConversationHistory
} from "./conversation-service.js";
import {
  buildLeadFormSchema,
  detectCommercialIntent
} from "./intent-service.js";

const client = new OpenAI({
  apiKey: env.openAiApiKey
});

function mapHistoryToMessages(history) {
  return history.map((message) => ({
    role: message.role,
    content: message.content
  }));
}

function extractUsage(response) {
  return {
    inputTokens: response.usage?.prompt_tokens || null,
    outputTokens: response.usage?.completion_tokens || null
  };
}

function fallbackReply() {
  return "Ahora mismo no he podido responder bien por un problema temporal. Si quieres, cuéntame en una frase qué necesitas y lo intentamos de nuevo, o te preparo el paso para que Starxia revise tu caso.";
}

function serializeOpenAiError(error) {
  return {
    name: error?.name || null,
    message: error?.message || null,
    status: error?.status || error?.statusCode || null,
    type: error?.type || null,
    code: error?.code || null,
    param: error?.param || null,
    requestId: error?.request_id || error?.headers?.["x-request-id"] || null,
    cause: error?.cause?.message || null,
    error: error?.error || null
  };
}

export async function processChatMessage({
  conversation,
  message,
  origin,
  pageUrl,
  preferredModel
}) {
  const cleanMessage = sanitizeText(message, env.maxInputChars);
  const intentResult = detectCommercialIntent(cleanMessage);
  const history = await getConversationHistory(conversation.id, env.maxHistoryMessages);
  const systemPrompt = await buildSystemPrompt();

  await appendMessage({
    conversationId: conversation.id,
    role: "user",
    content: cleanMessage
  });

  try {
    const response = await client.chat.completions.create({
      model: preferredModel === "premium" ? env.openAiPremiumModel : env.openAiModel,
      temperature: 0.5,
      max_tokens: 500,
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        ...mapHistoryToMessages(history),
        {
          role: "user",
          content: buildUserPrompt(cleanMessage, {
            origin,
            pageUrl,
            suggestedIntent: intentResult.intent
          })
        }
      ]
    });

    const rawReply = response.choices?.[0]?.message?.content?.trim?.() || "";
    const reply = sanitizeText(rawReply || fallbackReply(), 4000);
    const usage = extractUsage(response);

    await appendMessage({
      conversationId: conversation.id,
      role: "assistant",
      content: reply,
      model: response.model || preferredModel,
      tokensIn: usage.inputTokens,
      tokensOut: usage.outputTokens
    });

    if (!rawReply) {
      console.warn("OpenAI chat completion did not include text output; using fallback reply.", {
        conversationId: conversation.id,
        responseId: response.id,
        model: response.model
      });
    }

    return {
      reply,
      intent: intentResult.intent,
      shouldShowCta: intentResult.shouldShowCta,
      ctaKind: intentResult.ctaKind,
      suggestedService: intentResult.suggestedService,
      leadFormSchema: intentResult.shouldShowCta ? buildLeadFormSchema(intentResult) : null
    };
  } catch (error) {
    const reply = fallbackReply();
    console.error("OpenAI chat request failed", {
      conversationId: conversation.id,
      preferredModel,
      model:
        preferredModel === "premium" ? env.openAiPremiumModel : env.openAiModel,
      origin,
      pageUrl,
      userMessage: cleanMessage,
      details: serializeOpenAiError(error)
    });
    await appendMessage({
      conversationId: conversation.id,
      role: "assistant",
      content: reply,
      model: "fallback"
    });
    throw Object.assign(error, {
      safeReply: reply,
      intentResult
    });
  }
}
