import { pool } from "../db/pool.js";
import { sanitizeNullableText, sanitizeText } from "../lib/sanitize.js";
import { createLead } from "./lead-service.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const skipWords = new Set([
  "saltar",
  "omite",
  "omitir",
  "paso",
  "prefiero no decirlo",
  "no quiero decirlo",
  "ns/nc",
  "no se",
  "no sé"
]);

const leadFields = [
  {
    key: "name",
    required: true,
    prompt: "Perfecto. Si te parece, lo hacemos por aquí mismo. Para empezar, ¿cómo te llamas?",
    apply(answer, draft) {
      draft.name = sanitizeText(answer, 120);
    }
  },
  {
    key: "business_name",
    required: false,
    prompt: "¿Cómo se llama tu negocio o proyecto? Si todavía no tiene nombre, puedes escribir \"saltar\".",
    apply(answer, draft) {
      draft.business_name = sanitizeNullableText(answer, 160);
    }
  },
  {
    key: "business_type",
    required: false,
    prompt: "¿A qué se dedica tu negocio o qué tipo de proyecto es? Si quieres, también puedes saltarlo.",
    apply(answer, draft) {
      draft.business_type = sanitizeNullableText(answer, 120);
    }
  },
  {
    key: "service_interest",
    required: false,
    prompt: "¿Qué te interesa más ahora mismo: web, webapp, app, automatización, chatbot o algo a medida?",
    apply(answer, draft) {
      draft.service_interest = sanitizeNullableText(answer, 160);
    }
  },
  {
    key: "has_website",
    required: false,
    prompt: "¿Ya tienes web? Puedes responder sí, no o saltarlo.",
    apply(answer, draft) {
      const normalized = normalizeAnswer(answer);
      if (normalized.includes("si") || normalized.includes("sí")) {
        draft.has_website = "yes";
      } else if (normalized.includes("no")) {
        draft.has_website = "no";
      } else {
        draft.has_website = "unknown";
      }
    }
  },
  {
    key: "problem_to_solve",
    required: true,
    prompt: "Cuéntame en una o dos frases qué quieres conseguir o qué problema quieres resolver.",
    apply(answer, draft) {
      draft.problem_to_solve = sanitizeText(answer, 2000);
    }
  },
  {
    key: "contact_channel",
    required: true,
    prompt: "¿Qué contacto prefieres que use Starxia para responderte? Puedes pasarme un email o un teléfono/WhatsApp.",
    validate(answer) {
      return sanitizeText(answer, 160).length >= 5;
    },
    validationMessage:
      "Necesito al menos un email o un teléfono/WhatsApp para que Starxia pueda contactarte.",
    apply(answer, draft) {
      const clean = sanitizeText(answer, 160);
      if (emailPattern.test(clean)) {
        draft.contact_email = clean;
      } else {
        draft.contact_phone = clean;
      }
    }
  },
  {
    key: "preferred_contact_time",
    required: false,
    prompt: "Última cosa: ¿hay algún horario que te venga mejor para que te contacten? Si no, puedes poner \"saltar\".",
    apply(answer, draft) {
      draft.preferred_contact_time = sanitizeNullableText(answer, 120);
    }
  }
];

function normalizeAnswer(answer) {
  return sanitizeText(answer, 2000).toLowerCase();
}

function isSkipped(answer) {
  return skipWords.has(normalizeAnswer(answer));
}

function getFieldIndex(fieldKey) {
  return leadFields.findIndex((field) => field.key === fieldKey);
}

function getFieldByKey(fieldKey) {
  return leadFields.find((field) => field.key === fieldKey) || null;
}

function getNextFieldKey(fieldKey) {
  const index = getFieldIndex(fieldKey);
  return leadFields[index + 1]?.key || null;
}

function mapDraftToLeadPayload(conversationId, draft) {
  return {
    conversation_id: conversationId,
    name: draft.name,
    business_name: draft.business_name || null,
    business_type: draft.business_type || null,
    location: draft.location || null,
    service_interest: draft.service_interest || null,
    has_website: draft.has_website || null,
    problem_to_solve: draft.problem_to_solve,
    contact_email: draft.contact_email || null,
    contact_phone: draft.contact_phone || null,
    preferred_contact_time: draft.preferred_contact_time || null
  };
}

export async function getLeadCaptureState(conversationId) {
  const { rows } = await pool.query(
    "SELECT * FROM lead_capture_states WHERE conversation_id = $1 LIMIT 1",
    [conversationId]
  );
  return rows[0] || null;
}

export async function startLeadCapture({ conversationId, suggestedService = null }) {
  const existing = await getLeadCaptureState(conversationId);
  if (existing && existing.status === "active") {
    const currentField = getFieldByKey(existing.current_field_key);
    return {
      reply:
        currentField?.prompt ||
        "Seguimos por aquí. Pásame el siguiente dato y lo voy guardando.",
      state: existing
    };
  }

  const draftData = suggestedService
    ? { service_interest: sanitizeNullableText(suggestedService, 160) }
    : {};

  const { rows } = await pool.query(
    `
      INSERT INTO lead_capture_states (conversation_id, current_field_key, draft_data)
      VALUES ($1, $2, $3::jsonb)
      ON CONFLICT (conversation_id)
      DO UPDATE SET
        status = 'active',
        current_field_key = EXCLUDED.current_field_key,
        draft_data = EXCLUDED.draft_data,
        updated_at = NOW(),
        completed_at = NULL
      RETURNING *;
    `,
    [conversationId, leadFields[0].key, JSON.stringify(draftData)]
  );

  return {
    reply: leadFields[0].prompt,
    state: rows[0]
  };
}

export async function advanceLeadCapture({ conversationId, answer }) {
  const state = await getLeadCaptureState(conversationId);
  if (!state || state.status !== "active") {
    return { active: false, completed: false, reply: "" };
  }

  const field = getFieldByKey(state.current_field_key);
  if (!field) {
    return { active: false, completed: false, reply: "" };
  }

  const draft = { ...(state.draft_data || {}) };
  const skipped = isSkipped(answer);
  const cleanAnswer = sanitizeText(answer, 2000);

  if (field.required && skipped) {
    return {
      active: true,
      completed: false,
      reply: `Ese dato sí me hace falta para poder guardarte como lead. ${field.prompt}`
    };
  }

  if (!skipped) {
    if (field.validate && !field.validate(cleanAnswer)) {
      return {
        active: true,
        completed: false,
        reply: field.validationMessage || field.prompt
      };
    }
    field.apply(cleanAnswer, draft);
  } else if (!field.required && field.key === "has_website") {
    draft.has_website = "unknown";
  }

  const nextFieldKey = getNextFieldKey(field.key);
  if (!nextFieldKey) {
    const lead = await createLead(mapDraftToLeadPayload(conversationId, draft));
    await pool.query(
      `
        UPDATE lead_capture_states
        SET status = 'completed',
            draft_data = $2::jsonb,
            updated_at = NOW(),
            completed_at = NOW()
        WHERE conversation_id = $1
      `,
      [conversationId, JSON.stringify(draft)]
    );

    return {
      active: false,
      completed: true,
      lead,
      reply:
        "Perfecto. Ya he guardado tus datos para que Starxia pueda revisar tu caso y contactarte con más contexto. Si quieres, también puedo seguir orientándote por aquí."
    };
  }

  const { rows } = await pool.query(
    `
      UPDATE lead_capture_states
      SET current_field_key = $2,
          draft_data = $3::jsonb,
          updated_at = NOW()
      WHERE conversation_id = $1
      RETURNING *;
    `,
    [conversationId, nextFieldKey, JSON.stringify(draft)]
  );

  return {
    active: true,
    completed: false,
    state: rows[0],
    reply: getFieldByKey(nextFieldKey).prompt
  };
}
