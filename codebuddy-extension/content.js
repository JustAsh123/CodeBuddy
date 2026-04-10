const BACKEND_URL = "http://localhost:3000/get-hints";
const PANEL_HOST_ID = "codebuddy-panel-host";

const TITLE_SELECTORS = [
  '[data-cy="question-title"]',
  'main [data-cy="question-title"]',
  'h1 a[href*="/problems/"]',
  'main h1',
  'main [role="heading"]',
];

const DESCRIPTION_SELECTORS = [
  '[data-track-load="description_content"]',
  '[data-key="description-content"]',
  'main article',
  'article',
  'main [role="main"] article',
  'main [role="main"] section',
];

const PANEL_CSS = `
  :host {
    all: initial;
  }

  * {
    box-sizing: border-box;
  }

  .cb-panel {
    position: fixed;
    top: 24px;
    right: 24px;
    width: 360px;
    max-height: calc(100vh - 48px);
    overflow-y: auto;
    z-index: 2147483647;
    border: 1px solid rgba(23, 34, 56, 0.12);
    border-radius: 16px;
    padding: 16px;
    background: #f3f6fb;
    box-shadow: 0 16px 24px rgba(23, 34, 56, 0.12);
    font-family: Arial, sans-serif;
    color: #172238;
  }

  .cb-stack {
    display: grid;
    gap: 16px;
  }

  .cb-card {
    display: grid;
    gap: 8px;
    padding: 16px;
    border-radius: 16px;
    background: #ffffff;
    border: 1px solid #dbe3ef;
  }

  .cb-card-hero {
    gap: 16px;
  }

  .cb-eyebrow {
    margin: 0;
    color: #4f6b9a;
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .cb-title {
    margin: 0;
    font-size: 24px;
    font-weight: 700;
  }

  .cb-status {
    min-height: 20px;
    margin: 0;
    color: #6b4f00;
    font-size: 14px;
    line-height: 1.45;
  }

  .cb-button {
    width: 100%;
    border: none;
    border-radius: 16px;
    padding: 16px;
    background: #2563eb;
    color: #ffffff;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    transition: background-color 0.2s ease, transform 0.2s ease, opacity 0.2s ease;
  }

  .cb-button:hover {
    background: #1d4ed8;
    transform: translateY(-1px);
  }

  .cb-button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
  }

  .cb-section {
    display: grid;
    gap: 8px;
    padding: 16px;
    border-radius: 16px;
    background: #ffffff;
    border: 1px solid #dbe3ef;
  }

  .cb-section-title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #172238;
  }

  .cb-section-text {
    margin: 0;
    font-size: 15px;
    line-height: 1.5;
    white-space: pre-wrap;
    color: #2b3b52;
  }
`;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForDomReady() {
  if (document.readyState === "complete" || document.readyState === "interactive") {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    document.addEventListener("DOMContentLoaded", resolve, { once: true });
  });
}

function getElementText(element) {
  return element?.innerText?.trim() || "";
}

function findFirstText(selectors) {
  for (const selector of selectors) {
    console.log(`Trying selector ${selector}...`);
    const text = getElementText(document.querySelector(selector));
    if (text) {
      return text;
    }
  }

  return "";
}

function findLongestText(selectors) {
  let longestText = "";

  for (const selector of selectors) {
    console.log(`Trying selector ${selector}...`);
    const elements = document.querySelectorAll(selector);

    for (const element of elements) {
      const text = getElementText(element);
      if (text.length > longestText.length) {
        longestText = text;
      }
    }
  }

  return longestText;
}

function extractTitle() {
  const title = findFirstText(TITLE_SELECTORS);

  if (!title) {
    console.warn("Problem title not found");
  }

  return title;
}

function extractDescription() {
  let description = findLongestText(DESCRIPTION_SELECTORS);

  if (!description) {
    const fallbackBlocks = Array.from(document.querySelectorAll("main div, main section"))
      .map((element) => getElementText(element))
      .filter((text) => text.length > 120 && /Example|Constraints|Input|Output/.test(text))
      .sort((a, b) => b.length - a.length);

    description = fallbackBlocks[0] || "";
  }

  return description;
}

function extractCode() {
  let code = "";
  const lines = document.querySelectorAll(".view-lines .view-line");

  if (lines.length > 0) {
    code = Array.from(lines)
      .map((line) => line.innerText)
      .join("\n");
  }

  if (!code) {
    const textarea = document.querySelector("textarea");
    if (textarea) {
      code = textarea.value;
    }
  }

  console.log("EXTRACTED CODE:", code);

  return code || "";
}

async function waitForProblemContent(maxAttempts = 8, retryDelayMs = 350) {
  console.log("Waiting for DOM...");
  await waitForDomReady();

  let lastSnapshot = {
    title: "",
    description: "",
    code: "",
  };

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    console.log(`Extracting data attempt ${attempt}`);

    const title = extractTitle();
    const description = extractDescription();
    const code = extractCode();

    lastSnapshot = {
      title: title || "",
      description: description || "",
      code: code || "",
    };

    if (lastSnapshot.title && lastSnapshot.description) {
      console.log("Extraction success");
      return lastSnapshot;
    }

    if (attempt < maxAttempts) {
      await delay(retryDelayMs);
    }
  }

  console.warn("Extraction failed");

  return {
    title: lastSnapshot.title || document.title || "",
    description: lastSnapshot.description || "",
    code: lastSnapshot.code || "",
  };
}

async function getProblemData() {
  console.log("Extracting data");

  const data = await waitForProblemContent();

  console.log("Extraction result", data);

  return {
    title: data.title || document.title || "",
    description: data.description || "",
    code: data.code || "",
  };
}

function getPanelElements(shadowRoot) {
  return {
    button: shadowRoot.getElementById("cb-get-hint"),
    status: shadowRoot.getElementById("cb-status"),
    analysis: shadowRoot.getElementById("cb-analysis"),
    mistake: shadowRoot.getElementById("cb-mistake"),
    hint1: shadowRoot.getElementById("cb-hint1"),
    hint2: shadowRoot.getElementById("cb-hint2"),
    hint3: shadowRoot.getElementById("cb-hint3"),
  };
}

function setPanelStatus(panel, message) {
  panel.status.textContent = message || "";
}

function setPanelResults(panel, data = {}) {
  panel.analysis.textContent = data.analysis || "";
  panel.mistake.textContent = data.mistake || "";
  panel.hint1.textContent = data.hint1 || "";
  panel.hint2.textContent = data.hint2 || "";
  panel.hint3.textContent = data.hint3 || "";
}

async function handleGetHintClick(panel) {
  panel.button.disabled = true;
  setPanelStatus(panel, "Thinking...");
  setPanelResults(panel, {});

  try {
    const data = await getProblemData();

    if (!data.title || !data.description) {
      setPanelStatus(panel, "Unable to find this problem yet.");
      return;
    }

    if (!data.code.trim()) {
      setPanelStatus(panel, "Write some code first.");
      return;
    }

    const response = await fetch(BACKEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        problem: `${data.title}\n${data.description}`,
        user_code: data.code,
        user_approach: "",
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch hints");
    }

    const result = await response.json();
    setPanelResults(panel, result);
    setPanelStatus(panel, "");
  } catch (error) {
    console.error("CodeBuddy panel error:", error);
    setPanelStatus(panel, error.message || "Failed to fetch hints");
  } finally {
    panel.button.disabled = false;
  }
}

async function createPanel() {
  await waitForDomReady();

  if (!document.body) {
    await delay(150);
  }

  const existingHost = document.getElementById(PANEL_HOST_ID);
  if (existingHost?.shadowRoot) {
    return getPanelElements(existingHost.shadowRoot);
  }

  const host = document.createElement("div");
  host.id = PANEL_HOST_ID;
  document.body.appendChild(host);

  const shadowRoot = host.attachShadow({ mode: "open" });
  shadowRoot.innerHTML = `
    <style>${PANEL_CSS}</style>
    <div class="cb-panel">
      <div class="cb-stack">
        <section class="cb-card cb-card-hero">
          <p class="cb-eyebrow">Guided Mentor</p>
          <h2 class="cb-title">CodeBuddy &#129504;</h2>
          <p id="cb-status" class="cb-status"></p>
          <button id="cb-get-hint" class="cb-button">Get Hint</button>
        </section>

        <section class="cb-section">
          <h3 class="cb-section-title">Analysis</h3>
          <p id="cb-analysis" class="cb-section-text"></p>
        </section>

        <section class="cb-section">
          <h3 class="cb-section-title">Mistake</h3>
          <p id="cb-mistake" class="cb-section-text"></p>
        </section>

        <section class="cb-section">
          <h3 class="cb-section-title">Hint 1</h3>
          <p id="cb-hint1" class="cb-section-text"></p>
        </section>

        <section class="cb-section">
          <h3 class="cb-section-title">Hint 2</h3>
          <p id="cb-hint2" class="cb-section-text"></p>
        </section>

        <section class="cb-section">
          <h3 class="cb-section-title">Hint 3</h3>
          <p id="cb-hint3" class="cb-section-text"></p>
        </section>
      </div>
    </div>
  `;

  const panel = getPanelElements(shadowRoot);
  panel.button.addEventListener("click", () => {
    handleGetHintClick(panel);
  });

  setPanelStatus(panel, "Ready when you are.");

  return panel;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "GET_DATA") {
    console.log("Message received");

    (async () => {
      const data = await getProblemData();
      sendResponse(data);
    })().catch((error) => {
      console.error("Extraction error:", error);
      sendResponse({
        title: document.title || "",
        description: "",
        code: "",
      });
    });

    return true;
  }
});

(async () => {
  try {
    await createPanel();
  } catch (error) {
    console.error("Failed to create CodeBuddy panel:", error);
  }
})();
