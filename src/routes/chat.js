import { Router } from "express";
import { z } from "zod";
import { env } from "../config/env.js";
import { hashIp } from "../lib/ip.js";
import { sanitizeText } from "../lib/sanitize.js";
import {
  appendMessage,
  getConversationById,
  getConversationHistory,
  getOrCreateConversation,
  updateConversationIntent
} from "../services/conversation-service.js";
import { logChatEvent } from "../services/event-service.js";
import { processChatMessage } from "../services/chat-service.js";
import {
  advanceLeadCapture,
  getLeadCaptureState,
  startLeadCapture
} from "../services/lead-capture-service.js";
import { createLead } from "../services/lead-service.js";
import { detectCommercialIntent } from "../services/intent-service.js";
import { upsertVisitor } from "../services/visitor-service.js";

export const chatRouter = Router();

const sessionSchema = z.object({
  visitor_id: z.string().min(8).max(120),
  origin: z.string().max(255).optional().nullable(),
  page_url: z.string().url().optional().nullable()
});

const messageSchema = z.object({
  visitor_id: z.string().min(8).max(120),
  conversation_id: z.string().uuid().optional().nullable(),
  origin: z.string().max(255).optional().nullable(),
  page_url: z.string().url().optional().nullable(),
  message: z.string().min(1).max(env.maxInputChars),
  model_tier: z.enum(["default", "premium"]).optional()
});

const eventSchema = z.object({
  visitor_id: z.string().min(8).max(120),
  conversation_id: z.string().uuid().optional().nullable(),
  event_type: z.string().min(1).max(120),
  payload: z.record(z.any()).optional()
});

const leadCaptureStartSchema = z.object({
  visitor_id: z.string().min(8).max(120),
  conversation_id: z.string().uuid(),
  origin: z.string().max(255).optional().nullable(),
  suggested_service: z.string().max(160).optional().nullable()
});

async function resolveVisitor(req, payload) {
  return upsertVisitor({
    visitorId: payload.visitor_id,
    origin: payload.origin || null,
    userAgent: req.get("user-agent") || null,
    ipHash: hashIp(req.ip)
  });
}

function buildFallbackLeadForm() {
  return {
    title: "Cuéntanos tu caso",
    description: "Si quieres, deja tus datos y Starxia podrá revisar tu necesidad.",
    fields: []
  };
}

function ensureReply(reply) {
  return reply && `${reply}`.trim()
    ? reply
    : "Ahora mismo no he podido responder bien por un problema temporal. Si quieres, vuelve a intentarlo o te ayudo a dejar tu caso preparado para que Starxia lo revise.";
}

chatRouter.post("/api/chat/session", async (req, res, next) => {
  try {
    const payload = sessionSchema.parse(req.body);
    const visitor = await resolveVisitor(req, payload);
    const conversation = await getOrCreateConversation(visitor.id, "general");
    const history = await getConversationHistory(conversation.id, env.maxHistoryMessages);
    const leadCaptureState = await getLeadCaptureState(conversation.id);

    await logChatEvent({
      visitorDbId: visitor.id,
      conversationId: conversation.id,
      eventType: "session_started",
      payload: { page_url: payload.page_url || null }
    });

    res.json({
      visitor_id: visitor.visitor_id,
      conversation_id: conversation.id,
      messages: history,
      lead_capture_active: leadCaptureState?.status === "active"
    });
  } catch (error) {
    next(error);
  }
});

chatRouter.get("/api/chat/history", async (req, res, next) => {
  try {
    const visitorId = sanitizeText(req.query.visitor_id, 120);
    if (!visitorId) {
      return res.status(400).json({ error: "visitor_id is required" });
    }

    const visitor = await upsertVisitor({
      visitorId,
      origin: req.query.origin ? sanitizeText(req.query.origin, 255) : null,
      userAgent: req.get("user-agent") || null,
      ipHash: hashIp(req.ip)
    });
    const conversation = await getOrCreateConversation(visitor.id, "general");
    const history = await getConversationHistory(conversation.id, env.maxHistoryMessages);
    const leadCaptureState = await getLeadCaptureState(conversation.id);

    res.json({
      conversation_id: conversation.id,
      messages: history,
      lead_capture_active: leadCaptureState?.status === "active"
    });
  } catch (error) {
    next(error);
  }
});

chatRouter.post("/api/chat/message", async (req, res, next) => {
  try {
    const payload = messageSchema.parse(req.body);
    const visitor = await resolveVisitor(req, payload);
    const inferredIntent = detectCommercialIntent(payload.message);

    let conversation = null;
    if (payload.conversation_id) {
      conversation = await getConversationById(payload.conversation_id);
      if (conversation && conversation.visitor_id !== visitor.id) {
        conversation = null;
      }
    }

    if (!conversation) {
      conversation = await getOrCreateConversation(visitor.id, inferredIntent.intent);
    } else if (inferredIntent.intent !== "general") {
      await updateConversationIntent(conversation.id, inferredIntent.intent);
    }

    const leadCaptureState = await getLeadCaptureState(conversation.id);
    if (leadCaptureState?.status === "active") {
      await appendMessage({
        conversationId: conversation.id,
        role: "user",
        content: payload.message
      });

      const captureResult = await advanceLeadCapture({
        conversationId: conversation.id,
        answer: payload.message
      });

      await appendMessage({
        conversationId: conversation.id,
        role: "assistant",
        content: captureResult.reply,
        model: "lead-capture"
      });

      await logChatEvent({
        visitorDbId: visitor.id,
        conversationId: conversation.id,
        eventType: captureResult.completed ? "lead_capture_completed" : "lead_capture_progressed",
        payload: { completed: captureResult.completed }
      });

      return res.json({
        reply: captureResult.reply,
        conversation_id: conversation.id,
        should_show_cta: false,
        cta_kind: null,
        suggested_service: null,
        lead_form_schema: null,
        lead_capture_active: captureResult.active
      });
    }

    try {
      const result = await processChatMessage({
        conversation,
        message: payload.message,
        origin: payload.origin || null,
        pageUrl: payload.page_url || null,
        preferredModel: payload.model_tier === "premium" ? "premium" : "default"
      });

      await logChatEvent({
        visitorDbId: visitor.id,
        conversationId: conversation.id,
        eventType: "message_processed",
        payload: {
          intent: result.intent,
          cta_kind: result.ctaKind,
          page_url: payload.page_url || null
        }
      });

      res.json({
        reply: ensureReply(result.reply),
        conversation_id: conversation.id,
        should_show_cta: result.shouldShowCta,
        cta_kind: result.ctaKind,
        suggested_service: result.suggestedService,
        lead_form_schema: result.leadFormSchema,
        lead_capture_active: false
      });
    } catch (error) {
      await logChatEvent({
        visitorDbId: visitor.id,
        conversationId: conversation.id,
        eventType: "openai_error",
        payload: { message: error.message }
      });

      res.status(200).json({
        reply: ensureReply(error.safeReply),
        conversation_id: conversation.id,
        should_show_cta: error.intentResult?.shouldShowCta || false,
        cta_kind: error.intentResult?.ctaKind || null,
        suggested_service: error.intentResult?.suggestedService || null,
        lead_form_schema: error.intentResult?.shouldShowCta ? buildFallbackLeadForm() : null,
        lead_capture_active: false
      });
    }
  } catch (error) {
    next(error);
  }
});

chatRouter.post("/api/chat/lead-capture/start", async (req, res, next) => {
  try {
    const payload = leadCaptureStartSchema.parse(req.body);
    const visitor = await resolveVisitor(req, payload);
    const conversation = await getConversationById(payload.conversation_id);

    if (!conversation || conversation.visitor_id !== visitor.id) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const startResult = await startLeadCapture({
      conversationId: conversation.id,
      suggestedService: payload.suggested_service || null
    });

    await appendMessage({
      conversationId: conversation.id,
      role: "assistant",
      content: startResult.reply,
      model: "lead-capture"
    });

    await logChatEvent({
      visitorDbId: visitor.id,
      conversationId: conversation.id,
      eventType: "lead_capture_started",
      payload: {
        suggested_service: payload.suggested_service || null
      }
    });

    res.status(201).json({
      ok: true,
      reply: startResult.reply,
      lead_capture_active: true
    });
  } catch (error) {
    next(error);
  }
});

chatRouter.post("/api/chat/lead", async (req, res, next) => {
  try {
    const lead = await createLead(req.body);

    if (lead.conversation_id) {
      await appendMessage({
        conversationId: lead.conversation_id,
        role: "assistant",
        content:
          "Perfecto. Ya he dejado tus datos preparados para que Starxia revise tu caso y pueda contactarte con más contexto.",
        model: "system"
      });
    }

    res.status(201).json({
      ok: true,
      lead_id: lead.id
    });
  } catch (error) {
    next(error);
  }
});

chatRouter.post("/api/chat/event", async (req, res, next) => {
  try {
    const payload = eventSchema.parse(req.body);
    const visitor = await resolveVisitor(req, payload);

    await logChatEvent({
      visitorDbId: visitor.id,
      conversationId: payload.conversation_id || null,
      eventType: payload.event_type,
      payload: payload.payload || {}
    });

    res.status(201).json({ ok: true });
  } catch (error) {
    next(error);
  }
});
