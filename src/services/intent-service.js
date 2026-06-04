const intentRules = [
  {
    intent: "quote",
    ctaKind: "quote",
    suggestedService: "Presupuesto personalizado",
    patterns: [
      /presupuesto/i,
      /cu[aá]nto costar[ií]a/i,
      /cu[aá]nto cuesta/i,
      /precio exacto/i,
      /quiero contratar/i,
      /propuesta/i
    ]
  },
  {
    intent: "app",
    ctaKind: "quote",
    suggestedService: "App o webapp a medida",
    patterns: [
      /\bapp\b/i,
      /webapp/i,
      /software a medida/i,
      /plataforma/i,
      /saas/i
    ]
  },
  {
    intent: "automation",
    ctaKind: "audit",
    suggestedService: "Automatización",
    patterns: [
      /automatiz/i,
      /conectar herramientas/i,
      /ahorrar tiempo/i,
      /proceso/i,
      /integraci[oó]n/i
    ]
  },
  {
    intent: "chatbot",
    ctaKind: "contact",
    suggestedService: "Chat IA",
    patterns: [
      /chatbot/i,
      /asistente/i,
      /whatsapp/i,
      /preguntas repetidas/i
    ]
  },
  {
    intent: "website",
    ctaKind: "audit",
    suggestedService: "Página web",
    patterns: [
      /p[aá]gina web/i,
      /\bweb\b/i,
      /landing/i,
      /sitio web/i,
      /tienda online/i
    ]
  }
];

const highIntentPatterns = [
  /quiero/i,
  /necesito/i,
  /contratar/i,
  /me interesa/i,
  /empezar/i
];

export function detectCommercialIntent(message) {
  const normalized = `${message || ""}`.trim();
  if (!normalized) {
    return {
      intent: "general",
      shouldShowCta: false,
      ctaKind: null,
      suggestedService: null
    };
  }

  const matchedRule = intentRules.find((rule) =>
    rule.patterns.some((pattern) => pattern.test(normalized))
  );

  const highIntent = highIntentPatterns.some((pattern) => pattern.test(normalized));

  if (!matchedRule) {
    return {
      intent: "general",
      shouldShowCta: false,
      ctaKind: null,
      suggestedService: null
    };
  }

  return {
    intent: matchedRule.intent,
    shouldShowCta: highIntent || matchedRule.intent === "quote",
    ctaKind: matchedRule.ctaKind,
    suggestedService: matchedRule.suggestedService
  };
}

export function buildLeadFormSchema(intentResult) {
  const titleMap = {
    audit: "Cuéntanos tu caso",
    quote: "Pide un presupuesto orientativo",
    contact: "Te ayudamos a seguir"
  };

  return {
    title: titleMap[intentResult.ctaKind] || "Cuéntanos tu caso",
    description:
      "Déjanos unos datos básicos y Starxia podrá revisar tu caso con más contexto.",
    fields: [
      { name: "name", label: "Tu nombre", type: "text", required: true },
      { name: "business_name", label: "Negocio o proyecto", type: "text", required: false },
      { name: "business_type", label: "Tipo de negocio", type: "text", required: false },
      { name: "location", label: "Ciudad o zona", type: "text", required: false },
      {
        name: "service_interest",
        label: "Qué te interesa",
        type: "text",
        required: false,
        defaultValue: intentResult.suggestedService || ""
      },
      {
        name: "has_website",
        label: "¿Ya tienes web?",
        type: "select",
        required: false,
        options: [
          { label: "Sí", value: "yes" },
          { label: "No", value: "no" },
          { label: "No estoy seguro/a", value: "unknown" }
        ]
      },
      {
        name: "problem_to_solve",
        label: "Qué quieres mejorar",
        type: "textarea",
        required: true
      },
      { name: "contact_email", label: "Email", type: "email", required: false },
      { name: "contact_phone", label: "Teléfono o WhatsApp", type: "text", required: false },
      {
        name: "preferred_contact_time",
        label: "Mejor horario para contactar",
        type: "text",
        required: false
      }
    ]
  };
}
