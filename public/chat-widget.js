(function () {
  const defaultConfig = {
    apiBase: "",
    origin: window.location.hostname,
    pageUrl: window.location.href,
    title: "Starbot",
    subtitle: "Asesor IA Gratuito",
    position: "right",
    avatarUrl: "",
    initialMessages: [
      "Hola, soy Starbot.",
      "Puedo ayudarte a aclarar que necesitas para una web, app, automatizacion o chatbot y orientarte hacia la opcion que mas te convenga."
    ],
    contactUrl: "https://starxia.com/#contacto",
    launcherGreeting: "Hola, soy Starbot, tu asesor IA gratuito..."
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
        display: inline-flex;
        align-items: flex-end;
        gap: 12px;
        padding: 0;
        border: none;
        background: transparent;
        cursor: pointer;
      }
      .starxia-avatar {
        width: 72px;
        height: 72px;
        border-radius: 50%;
        overflow: hidden;
        position: relative;
        flex: 0 0 auto;
        box-shadow: 0 20px 40px rgba(5, 10, 30, 0.28);
        transition: transform 0.22s ease, box-shadow 0.22s ease;
      }
      .starxia-launcher:hover .starxia-avatar {
        transform: translateY(-2px);
        box-shadow: 0 24px 44px rgba(5, 10, 30, 0.36);
      }
      .starxia-avatar img,
      .starxia-header-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .starxia-online-dot {
        position: absolute;
        width: 13px;
        height: 13px;
        border-radius: 50%;
        background: #22c55e;
        right: 7px;
        bottom: 8px;
        border: 2px solid #08101f;
      }
      .starxia-launcher-prompt {
        position: relative;
        max-width: min(340px, calc(100vw - 136px));
        min-height: 26px;
        padding: 15px 18px;
        border-radius: 22px;
        background: linear-gradient(135deg, #ff6f3c, #f3521e);
        color: #fff;
        box-shadow: 0 20px 40px rgba(243, 82, 30, 0.24);
        opacity: 0;
        transform: translateY(10px) scale(0.94);
        transform-origin: bottom right;
        transition: opacity 0.3s ease, transform 0.3s ease;
      }
      .starxia-launcher-prompt::after {
        content: "";
        position: absolute;
        right: -7px;
        bottom: 13px;
        width: 18px;
        height: 18px;
        background: #f45a24;
        border-radius: 3px 12px 3px 12px;
        transform: rotate(45deg);
      }
      .starxia-launcher-prompt.is-visible {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
      .starxia-launcher-prompt-text {
        display: block;
        font-size: 16px;
        font-weight: 600;
        line-height: 1.35;
        letter-spacing: -0.02em;
      }
      .starxia-launcher-prompt.is-typing .starxia-launcher-prompt-text::after {
        content: "";
        display: inline-block;
        width: 1px;
        height: 1.1em;
        margin-left: 2px;
        vertical-align: -2px;
        background: rgba(255,255,255,0.9);
        animation: starxia-caret-blink 0.95s step-end infinite;
      }
      @keyframes starxia-caret-blink {
        50% {
          opacity: 0;
        }
      }
      .starxia-panel {
        width: min(390px, calc(100vw - 24px));
        height: min(680px, calc(100vh - 120px));
        background:
          radial-gradient(circle at top, rgba(124, 58, 237, 0.2), transparent 30%),
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
      }
      .starxia-message-body > *:first-child {
        margin-top: 0;
      }
      .starxia-message-body > *:last-child {
        margin-bottom: 0;
      }
      .starxia-message-body p {
        margin: 0 0 10px;
      }
      .starxia-message-body ul,
      .starxia-message-body ol {
        margin: 0 0 12px 18px;
        padding: 0;
      }
      .starxia-message-body li {
        margin: 0 0 8px;
      }
      .starxia-message-body strong {
        color: #ffffff;
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
        width: 100%;
        min-height: 54px;
        max-height: 120px;
        resize: vertical;
        padding: 14px 16px;
        border-radius: 14px;
        border: 1px solid rgba(255,255,255,0.1);
        background: rgba(6, 12, 26, 0.95);
        color: #fff;
        font-size: 14px;
        box-sizing: border-box;
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
          left: auto;
          bottom: 12px;
        }
        .starxia-launcher {
          gap: 10px;
        }
        .starxia-avatar {
          width: 66px;
          height: 66px;
        }
        .starxia-launcher-prompt {
          max-width: min(220px, calc(100vw - 108px));
          padding: 12px 14px;
        }
        .starxia-launcher-prompt-text {
          font-size: 14px;
        }
        .starxia-panel {
          width: calc(100vw - 24px);
          height: min(76vh, 680px);
        }
      }
    </style>
    <button type="button" class="starxia-launcher" aria-label="Abrir chat de Starbot">
      <span class="starxia-launcher-prompt" aria-hidden="true">
        <span class="starxia-launcher-prompt-text"></span>
      </span>
      <span class="starxia-avatar">
        ${config.avatarUrl ? `<img src="${config.avatarUrl}" alt="Avatar de Starbot" />` : "AI"}
        <span class="starxia-online-dot"></span>
      </span>
    </button>
    <section class="starxia-panel" aria-live="polite">
      <header class="starxia-header">
        <div class="starxia-header-meta">
          <div class="starxia-header-avatar">
            ${config.avatarUrl ? `<img src="${config.avatarUrl}" alt="Avatar de Starbot" />` : ""}
          </div>
          <div>
            <div class="starxia-header-title">${escapeHtml(config.title)}</div>
            <div class="starxia-header-subtitle">${escapeHtml(config.subtitle)}</div>
          </div>
        </div>
        <button type="button" class="starxia-close" aria-label="Cerrar chat">&times;</button>
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
  const launcherPrompt = root.querySelector(".starxia-launcher-prompt");
  const launcherPromptText = root.querySelector(".starxia-launcher-prompt-text");
  const panel = root.querySelector(".starxia-panel");
  const closeButton = root.querySelector(".starxia-close");
  const messagesEl = root.querySelector(".starxia-messages");
  const textarea = root.querySelector("textarea");
  const sendButton = root.querySelector(".starxia-send");
  const helperText = root.querySelector(".starxia-helper");

  let conversationId = null;
  let sessionLoaded = false;
  let leadCaptureActive = false;
  let launcherRevealTimer = null;
  let launcherTypingDelayTimer = null;
  let launcherTypingTimer = null;

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
      helperText.textContent = "Estoy recogiendo tus datos para derivar tu caso. Puedes responder por aqui y te ire guiando.";
      textarea.placeholder = "Escribe tu respuesta...";
    } else {
      helperText.textContent = "Puedo orientarte sobre webs, apps, automatizaciones y soluciones con IA.";
      textarea.placeholder = "Escribe tu duda...";
    }
  }

  function clearLauncherTimers() {
    if (launcherRevealTimer) {
      window.clearTimeout(launcherRevealTimer);
      launcherRevealTimer = null;
    }
    if (launcherTypingDelayTimer) {
      window.clearTimeout(launcherTypingDelayTimer);
      launcherTypingDelayTimer = null;
    }
    if (launcherTypingTimer) {
      window.clearInterval(launcherTypingTimer);
      launcherTypingTimer = null;
    }
  }

  function startLauncherSequence() {
    clearLauncherTimers();
    launcherPrompt.classList.remove("is-visible", "is-typing");
    launcherPromptText.textContent = "";

    launcherRevealTimer = window.setTimeout(() => {
      launcherPrompt.classList.add("is-visible");
    }, 1000);

    launcherTypingDelayTimer = window.setTimeout(() => {
      const fullText = config.launcherGreeting || defaultConfig.launcherGreeting;
      let index = 0;
      launcherPrompt.classList.add("is-typing");
      launcherTypingTimer = window.setInterval(() => {
        index += 1;
        launcherPromptText.textContent = fullText.slice(0, index);

        if (index >= fullText.length) {
          window.clearInterval(launcherTypingTimer);
          launcherTypingTimer = null;
          launcherPrompt.classList.remove("is-typing");
        }
      }, 35);
    }, 2000);
  }

  function renderMessage(role, content, options) {
    const settings = Object.assign(
      {
        scrollMode: "bottom"
      },
      options || {}
    );
    const message = document.createElement("div");
    message.className =
      "starxia-message " +
      (role === "user" ? "starxia-message--user" : "starxia-message--assistant");
    const body = document.createElement("div");
    body.className = "starxia-message-body";
    if (role === "assistant") {
      body.innerHTML = formatAssistantMessage(content);
    } else {
      body.textContent = content;
    }
    message.appendChild(body);
    const previousScrollTop = messagesEl.scrollTop;
    messagesEl.appendChild(message);

    if (settings.scrollMode === "bottom") {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    } else if (settings.scrollMode === "preserve") {
      messagesEl.scrollTop = previousScrollTop;
    }
  }

  function formatInlineText(text) {
    return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  }

  function formatAssistantMessage(content) {
    const source = String(content || "").replace(/\r\n/g, "\n");
    const normalized = source
      .replace(/(\d+)\.\s+\*\*/g, "\n$1. **")
      .replace(/(\d+)\.\s+(?=[A-ZÁÉÍÓÚÑ])/g, "\n$1. ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    const blocks = normalized.split(/\n\s*\n/).filter(Boolean);
    const html = [];

    blocks.forEach((block) => {
      const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
      if (!lines.length) {
        return;
      }

      const ordered = lines.every((line) => /^\d+\.\s+/.test(line));
      const unordered = lines.every((line) => /^[-*]\s+/.test(line));

      if (ordered || unordered) {
        const tag = ordered ? "ol" : "ul";
        const items = lines.map((line) => {
          const clean = ordered
            ? line.replace(/^\d+\.\s+/, "")
            : line.replace(/^[-*]\s+/, "");
          return `<li>${formatInlineText(clean)}</li>`;
        });
        html.push(`<${tag}>${items.join("")}</${tag}>`);
        return;
      }

      html.push(`<p>${formatInlineText(lines.join(" "))}</p>`);
    });

    return html.join("") || `<p>${formatInlineText(source)}</p>`;
  }

  function revealAssistantContent(messageEl, hasCta) {
    const userMessages = messagesEl.querySelectorAll(".starxia-message--user");
    const lastUserMessage = userMessages[userMessages.length - 1];
    const messageHeight = messageEl ? messageEl.offsetHeight : 0;
    const shouldAutoScroll =
      !hasCta &&
      messageHeight > 0 &&
      messageHeight <= 140;

    if (shouldAutoScroll) {
      messagesEl.scrollTop = messagesEl.scrollHeight;
      return;
    }

    if (!lastUserMessage) {
      return;
    }

    const containerRect = messagesEl.getBoundingClientRect();
    const userRect = lastUserMessage.getBoundingClientRect();
    const safeOffset = Math.max(0, userRect.bottom - containerRect.bottom + 24);
    messagesEl.scrollTop += safeOffset;
  }

  function renderLeadCard(schema, ctaKind, suggestedService) {
    const card = document.createElement("div");
    const buttonLabel =
      ctaKind === "quote"
        ? "Ir al formulario de contacto"
        : "Hablar con Starxia";

    card.className = "starxia-cta";
    card.innerHTML = `
      <div class="starxia-cta-title">${escapeHtml(schema.title || "Cuentanos tu caso")}</div>
      <div class="starxia-cta-copy">${escapeHtml(schema.description || "Dejanos contexto y Starxia podra ayudarte mejor.")}</div>
      ${suggestedService ? `<div class="starxia-cta-copy">Servicio sugerido: <strong>${escapeHtml(suggestedService)}</strong></div>` : ""}
      <button type="button" class="starxia-cta-button starxia-cta-contact">${buttonLabel}</button>
    `;

    const contactButton = card.querySelector(".starxia-cta-contact");
    contactButton.addEventListener("click", () => {
      logEvent("cta_contact_click", {
        cta_kind: ctaKind || null,
        suggested_service: suggestedService || null,
        destination: config.contactUrl
      });
      window.location.href = config.contactUrl;
    });

    const previousScrollTop = messagesEl.scrollTop;
    messagesEl.appendChild(card);
    messagesEl.scrollTop = previousScrollTop;
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
      renderMessage("assistant", payload.reply, { scrollMode: "preserve" });
      const assistantMessage = messagesEl.lastElementChild;

      if (payload.should_show_cta && payload.lead_form_schema) {
        renderLeadCard(payload.lead_form_schema, payload.cta_kind, payload.suggested_service);
        logEvent("cta_shown", {
          cta_kind: payload.cta_kind,
          suggested_service: payload.suggested_service
        });
      }

      revealAssistantContent(assistantMessage, !!payload.should_show_cta);
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
    clearLauncherTimers();
    panel.classList.add("is-open");
    launcher.classList.add("starxia-hidden");
    await ensureSession();
    logEvent("widget_opened");
  });

  closeButton.addEventListener("click", () => {
    panel.classList.remove("is-open");
    launcher.classList.remove("starxia-hidden");
    if (!launcherPromptText.textContent) {
      startLauncherSequence();
    }
    logEvent("widget_closed");
  });

  sendButton.addEventListener("click", sendMessage);
  textarea.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  });

  startLauncherSequence();
})();
