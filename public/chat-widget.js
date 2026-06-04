(function () {
  const defaultConfig = {
    apiBase: "",
    origin: window.location.hostname,
    pageUrl: window.location.href,
    title: "Starxist",
    subtitle: "Asesor IA Gratuito",
    position: "right",
    avatarUrl: "",
    initialMessages: [
      "Hola, soy Starxist.",
      "Puedo ayudarte a aclarar qué necesitas para una web, app, automatización o chatbot y orientarte hacia la opción que más te convenga."
    ],
    contactUrl: "https://starxia.com/#contacto"
  };

  const config = Object.assign({}, defaultConfig, window.STARXIA_CHAT_CONFIG || {});
  if (!config.apiBase) {
    console.error("STARXIA_CHAT_CONFIG.apiBase is required");
    return;
  }
  if (!config.avatarUrl) {
    config.avatarUrl = config.apiBase.replace(/\/$/, "") + "/widget/starxist-avatar.png";
  }

  const KEY = "visitor_id";

  function getVisitorId() {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = window.crypto && window.crypto.randomUUID
        ? window.crypto.randomUUID()
        : "visitor-" + Date.now() + "-" + Math.random().toString(16).slice(2);
      localStorage.setItem(KEY, id);
    }
    return id;
  }

  function escapeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  const root = document.createElement("div");
  root.id = "starxia-chat-widget";
  root.innerHTML = `
    <style>
      #starxia-chat-widget {
        position: fixed;
        ${config.position === "left" ? "left: 20px;" : "right: 20px;"}
        bottom: 24px;
        z-index: 999999;
        font-family: "Segoe UI", "Helvetica Neue", sans-serif;
      }
      .starxia-launcher {
        display: flex;
        align-items: center;
        gap: 12px;
        border: 1px solid rgba(132, 204, 22, 0.35);
        background:
          radial-gradient(circle at top left, rgba(139, 92, 246, 0.4), transparent 35%),
          linear-gradient(135deg, rgba(10, 14, 35, 0.96), rgba(6, 9, 22, 0.96));
        border-radius: 999px;
        padding: 10px 18px 10px 10px;
        box-shadow: 0 18px 40px rgba(5, 10, 30, 0.42);
        color: #fff;
        cursor: pointer;
        min-width: 220px;
        backdrop-filter: blur(12px);
      }
      .starxia-avatar {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: radial-gradient(circle at 30% 30%, #1e1b4b, #0b1023);
        border: 2px solid rgba(196, 181, 253, 0.7);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.25);
        position: relative;
        flex: 0 0 auto;
      }
      .starxia-avatar img,
      .starxia-header-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .starxia-online-dot {
        position: absolute;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #22c55e;
        right: 4px;
        bottom: 6px;
        border: 2px solid #08101f;
      }
      .starxia-launcher-title {
        font-size: 22px;
        font-weight: 700;
        line-height: 1;
        letter-spacing: -0.03em;
      }
      .starxia-launcher-badge {
        display: inline-flex;
        align-items: center;
        margin-top: 6px;
        font-size: 13px;
        color: #bef264;
        padding: 6px 12px;
        border-radius: 999px;
        border: 1px solid rgba(132, 204, 22, 0.55);
        background: rgba(5, 20, 6, 0.38);
      }
      .starxia-panel {
        width: min(390px, calc(100vw - 24px));
        height: min(680px, calc(100vh - 120px));
        background:
          radial-gradient(circle at top, rgba(124, 58, 237, 0.20), transparent 30%),
          linear-gradient(180deg, #0b1220, #060b18);
        border: 1px solid rgba(168, 85, 247, 0.25);
        border-radius: 28px;
        overflow: hidden;
        box-shadow: 0 26px 60px rgba(2, 6, 23, 0.56);
        display: none;
        flex-direction: column;
      }
      .starxia-panel.is-open {
        display: flex;
        margin-top: 14px;
      }
      .starxia-header {
        padding: 18px 18px 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid rgba(255,255,255,0.08);
        background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0));
      }
      .starxia-header-meta {
        display: flex;
        gap: 12px;
        align-items: center;
      }
      .starxia-header-avatar {
        width: 42px;
        height: 42px;
        border-radius: 50%;
        overflow: hidden;
        background: #121a31;
        border: 1px solid rgba(196,181,253,0.4);
      }
      .starxia-header-title {
        color: #fff;
        font-weight: 700;
        font-size: 17px;
      }
      .starxia-header-subtitle {
        color: #bef264;
        font-size: 12px;
        margin-top: 4px;
      }
      .starxia-close {
        background: transparent;
        border: none;
        color: rgba(255,255,255,0.72);
        font-size: 24px;
        cursor: pointer;
      }
      .starxia-messages {
        flex: 1;
        overflow-y: auto;
        padding: 18px;
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .starxia-message {
        max-width: 86%;
        padding: 14px 16px;
        border-radius: 20px;
        line-height: 1.45;
        font-size: 14px;
        white-space: pre-wrap;
      }
      .starxia-message--assistant {
        align-self: flex-start;
        background: rgba(16, 24, 44, 0.96);
        color: #edf2ff;
        border: 1px solid rgba(255,255,255,0.06);
      }
      .starxia-message--user {
        align-self: flex-end;
        background: linear-gradient(135deg, rgba(91, 33, 182, 0.98), rgba(139, 92, 246, 0.96));
        color: #fff;
        box-shadow: 0 12px 24px rgba(76, 29, 149, 0.28);
      }
      .starxia-cta {
        border-radius: 22px;
        padding: 16px;
        background: linear-gradient(180deg, rgba(15, 23, 42, 0.95), rgba(9, 14, 30, 0.95));
        border: 1px solid rgba(132, 204, 22, 0.28);
        color: #d7e2ff;
      }
      .starxia-cta-title {
        font-size: 15px;
        font-weight: 700;
        color: #fff;
      }
      .starxia-cta-copy {
        margin-top: 6px;
        font-size: 13px;
        color: #bfd0ff;
      }
      .starxia-cta-button {
        margin-top: 12px;
        border: none;
        background: linear-gradient(135deg, #84cc16, #65a30d);
        color: #08110b;
        font-weight: 700;
        padding: 12px 14px;
        border-radius: 14px;
        cursor: pointer;
        width: 100%;
      }
      .starxia-cta-button--secondary {
        background: rgba(255,255,255,0.08);
        color: #fff;
        border: 1px solid rgba(255,255,255,0.12);
      }
      .starxia-form input,
      .starxia-form textarea,
      .starxia-form select,
      .starxia-composer textarea {
        width: 100%;
        border-radius: 14px;
        border: 1px solid rgba(255,255,255,0.10);
        background: rgba(6, 12, 26, 0.95);
        color: #fff;
        padding: 11px 12px;
        font-size: 14px;
        box-sizing: border-box;
      }
      .starxia-composer {
        padding: 14px 18px 18px;
        border-top: 1px solid rgba(255,255,255,0.06);
        display: grid;
        gap: 10px;
      }
      .starxia-input-row {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 10px;
      }
      .starxia-composer textarea {
        min-height: 54px;
        max-height: 120px;
        resize: vertical;
        padding: 14px 16px;
      }
      .starxia-send {
        min-width: 96px;
        border: none;
        border-radius: 18px;
        background: linear-gradient(135deg, #22c55e, #84cc16);
        color: #08110b;
        font-weight: 700;
        cursor: pointer;
        padding: 0 16px;
      }
      .starxia-helper {
        font-size: 12px;
        color: rgba(220, 230, 255, 0.66);
      }
      .starxia-hidden {
        display: none !important;
      }
      @media (max-width: 600px) {
        #starxia-chat-widget {
          right: 12px;
          left: 12px;
          bottom: 12px;
        }
        .starxia-launcher {
          width: 100%;
          min-width: 0;
        }
        .starxia-panel {
          width: 100%;
          height: min(76vh, 680px);
        }
      }
    </style>
    <button type="button" class="starxia-launcher" aria-label="Abrir chat de Starxia">
      <span class="starxia-avatar">
        ${config.avatarUrl ? `<img src="${config.avatarUrl}" alt="Avatar de Starxist" />` : "AI"}
        <span class="starxia-online-dot"></span>
      </span>
      <span class="starxia-launcher-copy">
        <span class="starxia-launcher-title">${escapeHtml(config.title)}</span>
        <span class="starxia-launcher-badge">${escapeHtml(config.subtitle)}</span>
      </span>
    </button>
    <section class="starxia-panel" aria-live="polite">
      <header class="starxia-header">
        <div class="starxia-header-meta">
          <div class="starxia-header-avatar">
            ${config.avatarUrl ? `<img src="${config.avatarUrl}" alt="Avatar de Starxist" />` : ""}
          </div>
          <div>
            <div class="starxia-header-title">${escapeHtml(config.title)}</div>
            <div class="starxia-header-subtitle">${escapeHtml(config.subtitle)}</div>
          </div>
        </div>
        <button type="button" class="starxia-close" aria-label="Cerrar chat">×</button>
      </header>
      <div class="starxia-messages"></div>
      <div class="starxia-composer">
        <div class="starxia-input-row">
          <textarea placeholder="Escribe tu duda..." aria-label="Mensaje"></textarea>
          <button type="button" class="starxia-send">Enviar</button>
        </div>
        <div class="starxia-helper">Puedo orientarte sobre webs, apps, automatizaciones y soluciones con IA.</div>
      </div>
    </section>
  `;

  document.body.appendChild(root);

  const launcher = root.querySelector(".starxia-launcher");
  const panel = root.querySelector(".starxia-panel");
  const closeButton = root.querySelector(".starxia-close");
  const messagesEl = root.querySelector(".starxia-messages");
  const textarea = root.querySelector("textarea");
  const sendButton = root.querySelector(".starxia-send");
  const helperText = root.querySelector(".starxia-helper");

  let conversationId = null;
  let sessionLoaded = false;
  let currentLeadSchema = null;
  let leadCaptureActive = false;

  async function request(path, options) {
    const response = await fetch(config.apiBase.replace(/\/$/, "") + path, {
      headers: {
        "Content-Type": "application/json"
      },
      ...options
    });

    if (!response.ok) {
      throw new Error("Request failed");
    }

    return response.json();
  }

  function updateLeadCaptureUi() {
    if (leadCaptureActive) {
      helperText.textContent = "Estoy recogiendo tus datos para derivar tu caso. Puedes responder por aquí y te iré guiando.";
      textarea.placeholder = "Escribe tu respuesta...";
    } else {
      helperText.textContent = "Puedo orientarte sobre webs, apps, automatizaciones y soluciones con IA.";
      textarea.placeholder = "Escribe tu duda...";
    }
  }

  function renderMessage(role, content) {
    const message = document.createElement("div");
    message.className =
      "starxia-message " +
      (role === "user" ? "starxia-message--user" : "starxia-message--assistant");
    message.textContent = content;
    messagesEl.appendChild(message);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function renderLeadCard(schema, ctaKind, suggestedService) {
    currentLeadSchema = schema;
    const card = document.createElement("div");
    card.className = "starxia-cta";
    card.innerHTML = `
      <div class="starxia-cta-title">${escapeHtml(schema.title || "Cuéntanos tu caso")}</div>
      <div class="starxia-cta-copy">${escapeHtml(schema.description || "Déjanos contexto y Starxia podrá ayudarte mejor.")}</div>
      ${suggestedService ? `<div class="starxia-cta-copy">Servicio sugerido: <strong>${escapeHtml(suggestedService)}</strong></div>` : ""}
      <button type="button" class="starxia-cta-button starxia-cta-chat">${ctaKind === "quote" ? "Responder por chat" : "Quiero que me guiéis por chat"}</button>
      <button type="button" class="starxia-cta-button starxia-cta-button--secondary starxia-cta-form">${ctaKind === "quote" ? "Ir al formulario" : "Ir a contacto"}</button>
    `;

    const chatButton = card.querySelector(".starxia-cta-chat");
    const formButton = card.querySelector(".starxia-cta-form");

    chatButton.addEventListener("click", async () => {
      const payload = await request("/api/chat/lead-capture/start", {
        method: "POST",
        body: JSON.stringify({
          visitor_id: getVisitorId(),
          conversation_id: conversationId,
          origin: config.origin,
          suggested_service: suggestedService || ""
        })
      });

      leadCaptureActive = !!payload.lead_capture_active;
      updateLeadCaptureUi();
      chatButton.classList.add("starxia-hidden");
      formButton.classList.add("starxia-hidden");
      renderMessage("assistant", payload.reply);
      logEvent("lead_capture_started_from_cta", {
        suggested_service: suggestedService || null
      });
    });

    formButton.addEventListener("click", () => {
      logEvent("cta_contact_click", {
        suggested_service: suggestedService || null,
        destination: config.contactUrl
      });
      window.location.href = config.contactUrl;
    });

    messagesEl.appendChild(card);
    requestAnimationFrame(() => {
      card.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  async function logEvent(eventType, payload) {
    try {
      await request("/api/chat/event", {
        method: "POST",
        body: JSON.stringify({
          visitor_id: getVisitorId(),
          conversation_id: conversationId,
          event_type: eventType,
          payload: payload || {}
        })
      });
    } catch (error) {
      console.warn("Could not log event", error);
    }
  }

  async function ensureSession() {
    if (sessionLoaded) {
      return;
    }

    const payload = await request("/api/chat/session", {
      method: "POST",
      body: JSON.stringify({
        visitor_id: getVisitorId(),
        origin: config.origin,
        page_url: config.pageUrl
      })
    });

    conversationId = payload.conversation_id;
    leadCaptureActive = !!payload.lead_capture_active;
    updateLeadCaptureUi();

    const messages = payload.messages || [];
    if (messages.length === 0) {
      config.initialMessages.forEach((message) => renderMessage("assistant", message));
    } else {
      messages.forEach((message) => renderMessage(message.role, message.content));
    }

    sessionLoaded = true;
  }

  async function sendMessage() {
    const text = textarea.value.trim();
    if (!text) {
      return;
    }

    textarea.value = "";
    renderMessage("user", text);

    sendButton.disabled = true;
    sendButton.textContent = "Pensando...";

    try {
      const payload = await request("/api/chat/message", {
        method: "POST",
        body: JSON.stringify({
          visitor_id: getVisitorId(),
          conversation_id: conversationId,
          origin: config.origin,
          page_url: window.location.href,
          message: text
        })
      });

      conversationId = payload.conversation_id;
      leadCaptureActive = !!payload.lead_capture_active;
      updateLeadCaptureUi();
      renderMessage("assistant", payload.reply);

      if (payload.should_show_cta && payload.lead_form_schema) {
        renderLeadCard(payload.lead_form_schema, payload.cta_kind, payload.suggested_service);
        logEvent("cta_shown", {
          cta_kind: payload.cta_kind,
          suggested_service: payload.suggested_service
        });
      }
    } catch (error) {
      renderMessage(
        "assistant",
        "Ha habido un problema temporal al enviar el mensaje. Si quieres, prueba de nuevo en unos segundos."
      );
    } finally {
      sendButton.disabled = false;
      sendButton.textContent = "Enviar";
    }
  }

  launcher.addEventListener("click", async () => {
    panel.classList.add("is-open");
    launcher.classList.add("starxia-hidden");
    await ensureSession();
    logEvent("widget_opened");
  });

  closeButton.addEventListener("click", () => {
    panel.classList.remove("is-open");
    launcher.classList.remove("starxia-hidden");
    logEvent("widget_closed");
  });

  sendButton.addEventListener("click", sendMessage);
  textarea.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  });
})();
