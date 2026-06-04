import test from "node:test";
import assert from "node:assert/strict";
import { buildLeadFormSchema, detectCommercialIntent } from "../src/services/intent-service.js";

test("detects quote intent for pricing questions", () => {
  const result = detectCommercialIntent("Quiero un presupuesto para una app");
  assert.equal(result.intent, "quote");
  assert.equal(result.shouldShowCta, true);
  assert.equal(result.ctaKind, "quote");
});

test("detects automation intent", () => {
  const result = detectCommercialIntent("Necesito automatizar avisos y conectar herramientas");
  assert.equal(result.intent, "automation");
  assert.equal(result.ctaKind, "audit");
  assert.equal(result.suggestedService, "Automatización");
});

test("builds a lead form with default fields", () => {
  const schema = buildLeadFormSchema({
    ctaKind: "audit",
    suggestedService: "Página web"
  });

  assert.equal(schema.fields.some((field) => field.name === "name"), true);
  assert.equal(schema.fields.some((field) => field.name === "problem_to_solve"), true);
});
