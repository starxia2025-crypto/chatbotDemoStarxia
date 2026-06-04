const buckets = new Map();

function nowWindow() {
  return Math.floor(Date.now() / 60_000);
}

export function createSimpleRateLimiter({ maxPerMinute = 20 } = {}) {
  return (req, res, next) => {
    const key = `${req.ip}:${req.body?.visitor_id || req.query?.visitor_id || "anonymous"}:${nowWindow()}`;
    const count = buckets.get(key) || 0;
    if (count >= maxPerMinute) {
      return res.status(429).json({
        error: "Has enviado demasiadas solicitudes seguidas. Espera un minuto y vuelve a intentarlo."
      });
    }

    buckets.set(key, count + 1);
    next();
  };
}
