import { z } from "zod";
import { pool } from "../db/pool.js";
import { sanitizeNullableText, sanitizeText } from "../lib/sanitize.js";

const leadSchema = z
  .object({
    conversation_id: z.string().uuid().optional().nullable(),
    name: z.string().min(1).max(120),
    business_name: z.string().max(160).optional().nullable(),
    business_type: z.string().max(120).optional().nullable(),
    location: z.string().max(120).optional().nullable(),
    service_interest: z.string().max(160).optional().nullable(),
    has_website: z.union([z.boolean(), z.enum(["yes", "no", "unknown"])]).optional().nullable(),
    problem_to_solve: z.string().min(1).max(2000),
    contact_email: z.string().email().max(160).optional().or(z.literal("")).nullable(),
    contact_phone: z.string().max(80).optional().nullable(),
    preferred_contact_time: z.string().max(120).optional().nullable()
  })
  .refine((value) => value.contact_email || value.contact_phone, {
    message: "Debe haber al menos un email o teléfono de contacto.",
    path: ["contact_email"]
  });

function normalizeHasWebsite(value) {
  if (value === true || value === "yes") {
    return true;
  }
  if (value === false || value === "no") {
    return false;
  }
  return null;
}

export function validateLead(payload) {
  return leadSchema.parse(payload);
}

export async function createLead(payload) {
  const lead = validateLead(payload);

  const query = `
    INSERT INTO leads (
      conversation_id,
      name,
      business_name,
      business_type,
      location,
      service_interest,
      has_website,
      problem_to_solve,
      contact_email,
      contact_phone,
      preferred_contact_time
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    RETURNING *;
  `;

  const values = [
    lead.conversation_id || null,
    sanitizeText(lead.name, 120),
    sanitizeNullableText(lead.business_name, 160),
    sanitizeNullableText(lead.business_type, 120),
    sanitizeNullableText(lead.location, 120),
    sanitizeNullableText(lead.service_interest, 160),
    normalizeHasWebsite(lead.has_website),
    sanitizeText(lead.problem_to_solve, 2000),
    sanitizeNullableText(lead.contact_email, 160),
    sanitizeNullableText(lead.contact_phone, 80),
    sanitizeNullableText(lead.preferred_contact_time, 120)
  ];

  const { rows } = await pool.query(query, values);
  return rows[0];
}
