import { loadRawKnowledge } from "../lib/raw-loader.js";

const MAX_KNOWLEDGE_CHARS = 12000;
const SECTION_SEPARATOR = /\r?\n## /;
const PRIORITY_HEADINGS = [
  "Objetivo del chatbot",
  "Tono de respuesta",
  "Qué es Starxia",
  "Mensaje corto recomendado",
  "A qué tipo de negocios ayuda Starxia",
  "Servicios principales",
  "Página web esencial",
  "Página web profesional",
  "Precios orientativos",
  "Límites importantes de los planes económicos",
  "Chat IA para web o WhatsApp",
  "El Chat IA no sustituye completamente a una persona",
  "Automatizaciones",
  "Precio de las automatizaciones",
  "Software o herramientas a medida",
  "Auditoría digital gratuita",
  "Proceso recomendado para contratar",
  "Cuándo recomendar el Plan Esencial",
  "Cuándo recomendar el Plan Profesional",
  "Cuándo recomendar Chat IA",
  "Cuándo recomendar automatizaciones",
  "Cuándo escalar a una persona",
  "Preguntas frecuentes y respuestas recomendadas",
  "Reglas para responder sobre precios",
  "Reglas para responder sobre IA",
  "Reglas para responder sobre privacidad y datos",
  "Reglas para responder si el usuario no sabe qué necesita",
  "Diagnóstico rápido recomendado",
  "Respuesta de cierre recomendada",
  "Información que el chatbot puede pedir para derivar el contacto",
  "Cosas que el chatbot no debe hacer",
  "Respuesta ideal si el usuario pide algo complejo",
  "Respuesta ideal si el usuario solo quiere algo barato",
  "Respuesta ideal si el usuario pregunta si su negocio necesita IA",
  "Resumen final para el chatbot"
];

const SYSTEM_RULES = `
Eres Starxist, el asesor IA de Starxia.

Objetivo:
- Ayudar a la persona a entender qué necesita para una web, webapp, app, automatización, chatbot o mejora digital.
- Recomendar la solución más simple que tenga sentido.
- Redirigir de forma natural a los servicios de Starxia cuando encajen.

Estilo:
- Responde siempre en español.
- Tono cercano, profesional, claro y directo.
- Prioriza respuestas útiles y breves.
- Evita tecnicismos si no son necesarios.

Reglas comerciales:
- No inventes precios cerrados para proyectos personalizados.
- No prometas resultados garantizados.
- Si hay falta de contexto, haz 1 o 2 preguntas útiles antes de recomendar.
- Si detectas una necesidad concreta o intención alta, invita de forma natural a una auditoría o revisión del caso.
- Si el usuario pide algo simple, no vendas algo más complejo de lo necesario.

Reglas de seguridad y confianza:
- No des asesoramiento legal definitivo.
- Si preguntan por privacidad o tratamiento de datos, responde de forma prudente y recomienda revisión del caso.

Cuando recomiendes servicios, conecta la respuesta con lo que el usuario quiere conseguir:
- captar contactos
- ahorrar tiempo
- responder clientes
- vender online
- organizar procesos
`;

export async function buildSystemPrompt() {
  const knowledge = await loadRawKnowledge();
  const condensedKnowledge = condenseKnowledge(knowledge);
  return `${SYSTEM_RULES}\n\nBase de conocimiento condensada de Starxia:\n${condensedKnowledge}`;
}

export function buildUserPrompt(message, context = {}) {
  const { origin, pageUrl, suggestedIntent } = context;

  const hints = [
    origin ? `Origen del chat: ${origin}` : null,
    pageUrl ? `Página actual: ${pageUrl}` : null,
    suggestedIntent ? `Intención estimada del usuario: ${suggestedIntent}` : null
  ]
    .filter(Boolean)
    .join("\n");

  return hints ? `${hints}\n\nMensaje del usuario:\n${message}` : message;
}

function parseSections(markdown) {
  const normalized = `${markdown || ""}`.trim();
  if (!normalized) {
    return [];
  }

  const parts = normalized.split(SECTION_SEPARATOR);
  return parts.map((part, index) => {
    const block = index === 0 ? part : `## ${part}`;
    const [firstLine = "", ...rest] = block.split(/\r?\n/);
    const heading = firstLine.replace(/^##\s*/, "").trim();
    return {
      heading,
      block: block.trim(),
      body: rest.join("\n").trim()
    };
  });
}

function condenseKnowledge(markdown) {
  const sections = parseSections(markdown);
  const prioritized = PRIORITY_HEADINGS
    .map((heading) => sections.find((section) => section.heading === heading))
    .filter(Boolean);

  const seen = new Set(prioritized.map((section) => section.heading));
  const remaining = sections.filter((section) => !seen.has(section.heading));

  const selectedBlocks = [];
  let currentLength = 0;

  for (const section of [...prioritized, ...remaining]) {
    const nextBlock = section.block;
    const separatorLength = selectedBlocks.length > 0 ? 2 : 0;

    if (currentLength + separatorLength + nextBlock.length > MAX_KNOWLEDGE_CHARS) {
      if (selectedBlocks.length === 0) {
        return nextBlock.slice(0, MAX_KNOWLEDGE_CHARS);
      }
      break;
    }

    selectedBlocks.push(nextBlock);
    currentLength += separatorLength + nextBlock.length;
  }

  return selectedBlocks.join("\n\n");
}
