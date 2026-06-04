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

function mapHistoryToInput(history) {
  return history.map((message) => ({
    role: message.role,
    content: [{ type: "input_text", text: message.content }]
  }));
}

function extractUsage(response) {
  return {
    inputTokens: response.usage?.input_tokens || null,
    outputTokens: response.usage?.output_tokens || null
  };
}

function extractReplyText(response) {
  if (typeof response.output_text === "string" && response.output_text.trim()) {
    return response.output_text;
  }

  const outputItems = Array.isArray(response.output) ? response.output : [];
  const textParts = [];

  for (const item of outputItems) {
    const contentItems = Array.isArray(item?.content) ? item.content : [];
    for (const content of contentItems) {
      if (typeof content?.text === "string" && content.text.trim()) {
        textParts.push(content.text.trim());
      }
    }
  }

  return textParts.join("\n\n").trim();
}

function fallbackReply() {
  return "Ahora mismo no he podido responder bien por un problema temporal. Si quieres, cuéntame en una frase qué necesitas y lo intentamos de nuevo, o te preparo el paso para que Starxia revise tu caso.";
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
    const response = await client.responses.create({
      model: preferredModel === "premium" ? env.openAiPremiumModel : env.openAiModel,
      temperature: 0.5,
      max_output_tokens: 500,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: systemPrompt }]
        },
        ...mapHistoryToInput(history),
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: buildUserPrompt(cleanMessage, {
                origin,
                pageUrl,
                suggestedIntent: intentResult.intent
              })
            }
          ]
        }
      ]
    });

    const rawReply = extractReplyText(response);
    const reply = sanitizeText(rawReply || fallbackReply(), 4000);
    const usage = extractUsage(response);

    await appendMessage({
      conversationId: conversation.id,
      role: "assistant",
      content: reply,
      model: response.model,
      tokensIn: usage.inputTokens,
      tokensOut: usage.outputTokens
    });

    if (!rawReply) {
      console.warn("OpenAI response did not include text output; using fallback reply.", {
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
