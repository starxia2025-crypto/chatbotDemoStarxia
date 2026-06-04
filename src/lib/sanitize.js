const unsafePattern = /<[^>]*>/g;

export function sanitizeText(value, maxLength = 2500) {
  return `${value || ""}`
    .replace(unsafePattern, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function sanitizeNullableText(value, maxLength = 2500) {
  const sanitized = sanitizeText(value, maxLength);
  return sanitized || null;
}
