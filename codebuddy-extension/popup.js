const pageInfo = document.getElementById("pageInfo");
const statusEl = document.getElementById("status");
const getHintBtn = document.getElementById("getHintBtn");
const regenerateBtn = document.getElementById("regenerateBtn");
const userApproachEl = document.getElementById("userApproach");
const coachNoteEl = document.getElementById("coachNote");
const hintUsageEl = document.getElementById("hintUsage");
const analysisEl = document.getElementById("analysis");
const mistakeEl = document.getElementById("mistake");
const hint1El = document.getElementById("hint1");
const hint2El = document.getElementById("hint2");
const hint3El = document.getElementById("hint3");
const showHint1Btn = document.getElementById("showHint1");
const showHint2Btn = document.getElementById("showHint2");
const showHint3Btn = document.getElementById("showHint3");
const hint1Box = document.getElementById("hint1Box");
const hint2Box = document.getElementById("hint2Box");
const hint3Box = document.getElementById("hint3Box");
let hintsUsed = 0;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function setStatus(message) {
  statusEl.textContent = message;
}

function setProblemTitle(title) {
  pageInfo.textContent = title || "Open a LeetCode problem";
}

function setCoachNote(message) {
  coachNoteEl.textContent = message || "";
  coachNoteEl.classList.toggle("hidden", !message);
}

function setOutput(data = {}) {
  analysisEl.textContent = data.analysis || "";
  mistakeEl.textContent = data.mistake || "";
  hint1El.textContent = data.hint1 || "";
  hint2El.textContent = data.hint2 || "";
  hint3El.textContent = data.hint3 || "";
}

function updateHintUsage() {
  hintUsageEl.textContent = `Hints used: ${hintsUsed}/3`;
}

function incrementHintUsage() {
  hintsUsed = Math.min(3, hintsUsed + 1);
  updateHintUsage();
}

function resetHints() {
  hintsUsed = 0;
  updateHintUsage();
  hint1Box.classList.add("hidden");
  hint2Box.classList.add("hidden");
  hint3Box.classList.add("hidden");
  showHint1Btn.classList.add("hidden");
  showHint2Btn.classList.add("hidden");
  showHint3Btn.classList.add("hidden");
  showHint1Btn.disabled = false;
  showHint2Btn.disabled = false;
  showHint3Btn.disabled = false;
}

function enableHints(data) {
  resetHints();
  regenerateBtn.classList.remove("hidden");

  if (data.hint1) {
    showHint1Btn.classList.remove("hidden");
  }
}

function detectPatterns(code) {
  const patterns = [];
  const nestedLoopPattern =
    /(for\s*\([^)]*\)\s*\{[\s\S]{0,400}(for|while)\s*\()|(while\s*\([^)]*\)\s*\{[\s\S]{0,400}(for|while)\s*\()/;
  const repeatedScanningPattern =
    /((for|while)\s*\([^)]*\)[\s\S]{0,250}(\.includes\(|\.indexOf\(|\.find\(|\.filter\(|\.some\(|\.every\())|((\.includes\(|\.indexOf\(|\.find\(|\.filter\(|\.some\(|\.every\().*(\.includes\(|\.indexOf\(|\.find\(|\.filter\(|\.some\(|\.every\())/s;

  if (nestedLoopPattern.test(code)) {
    patterns.push("nested_loop");
  }

  if (repeatedScanningPattern.test(code)) {
    patterns.push("repeated_scanning");
  }

  return patterns;
}

function isPartiallyCorrect(code) {
  const hasStructure = /(function|=>|class\s+)/.test(code);
  const hasLogic = /(if\s*\(|for\s*\(|while\s*\(|return\b)/.test(code);
  return code.trim().length > 60 && hasStructure && hasLogic;
}

function buildCoachMessage(code, detectedPatterns) {
  const closeMessage = isPartiallyCorrect(code)
    ? "You're close. Your structure is there, now focus on tightening the core logic."
    : "";

  if (detectedPatterns.includes("nested_loop")) {
    return closeMessage
      ? `${closeMessage} This looks like O(n^2), can you optimize?`
      : "This looks like O(n^2), can you optimize?";
  }

  if (closeMessage) {
    return closeMessage;
  }

  return "";
}

function getActiveTab() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve(tabs?.[0]);
    });
  });
}

function sendMessageToContent(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve(response);
    });
  });
}

function injectContentScript(tabId) {
  return new Promise((resolve, reject) => {
    chrome.scripting.executeScript(
      {
        target: { tabId },
        files: ["content.js"],
      },
      () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        resolve();
      }
    );
  });
}

async function getTabData(tabId) {
  console.log("Sending message to content");

  try {
    const response = await sendMessageToContent(tabId, { type: "GET_DATA" });
    console.log("Received response", response);
    return response;
  } catch (error) {
    const message = error.message || "";
    const needsInjection =
      message.includes("Could not establish connection") ||
      message.includes("Receiving end does not exist");

    if (!needsInjection) {
      throw error;
    }

    console.warn("Content script not ready, reinjecting...", message);
    await injectContentScript(tabId);
    await delay(200);

    console.log("Sending message to content");
    const response = await sendMessageToContent(tabId, { type: "GET_DATA" });
    console.log("Received response", response);
    return response;
  }
}

async function loadProblemPreview() {
  try {
    const activeTab = await getActiveTab();

    if (!activeTab?.id || !activeTab.url?.startsWith("https://leetcode.com/problems/")) {
      setProblemTitle("");
      setStatus("Open a LeetCode problem");
      return;
    }

    const data = await getTabData(activeTab.id);
    console.log("Received data from content", data);

    if (!data?.title) {
      setProblemTitle("");
      setStatus("Open a LeetCode problem");
      return;
    }

    setProblemTitle(data.title);
    setStatus("");
  } catch (error) {
    console.error("Preview error:", error);
    setProblemTitle("");
    setStatus("Open a LeetCode problem");
  }
}

showHint1Btn.addEventListener("click", () => {
  hint1Box.classList.remove("hidden");
  showHint1Btn.disabled = true;
  incrementHintUsage();

  if (hint2El.textContent.trim()) {
    showHint2Btn.classList.remove("hidden");
  }
});

showHint2Btn.addEventListener("click", () => {
  hint2Box.classList.remove("hidden");
  showHint2Btn.disabled = true;
  incrementHintUsage();

  if (hint3El.textContent.trim()) {
    showHint3Btn.classList.remove("hidden");
  }
});

showHint3Btn.addEventListener("click", () => {
  hint3Box.classList.remove("hidden");
  showHint3Btn.disabled = true;
  incrementHintUsage();
});

async function requestHints() {
  console.log("Button clicked");
  getHintBtn.disabled = true;
  regenerateBtn.disabled = true;
  setStatus("Thinking...");
  setOutput({});
  resetHints();
  setCoachNote("");

  try {
    const activeTab = await getActiveTab();

    if (!activeTab?.id || !activeTab.url?.startsWith("https://leetcode.com/problems/")) {
      setProblemTitle("");
      setStatus("Open a LeetCode problem");
      return;
    }

    const data = await getTabData(activeTab.id);
    console.log("Received data from content", data);

    if (!data?.title || !data?.description) {
      setProblemTitle("");
      setStatus("Open a LeetCode problem");
      return;
    }

    if (!data.code?.trim()) {
      setProblemTitle(data.title);
      setStatus("Write some code first");
      return;
    }

    setProblemTitle(data.title);
    const detectedPatterns = detectPatterns(data.code || "");
    const coachMessage = buildCoachMessage(data.code || "", detectedPatterns);

    if (coachMessage) {
      setCoachNote(coachMessage);
    }

    console.log("Calling API");

    const response = await fetch("http://localhost:3000/get-hints", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        problem: `${data.title}\n${data.description}`,
        user_code: data.code,
        user_approach: userApproachEl.value.trim(),
        detected_patterns: detectedPatterns,
      }),
    });

    if (!response.ok) {
      throw new Error("Request failed");
    }

    const result = await response.json();
    console.log("API response received", result);

    setOutput(result);
    enableHints(result);
    setStatus("");
  } catch (error) {
    console.error("Fetch error:", error);
    setStatus(error.message || "Failed to fetch hints");
  } finally {
    getHintBtn.disabled = false;
    regenerateBtn.disabled = false;
  }
}

document.getElementById("getHintBtn").addEventListener("click", requestHints);
regenerateBtn.addEventListener("click", requestHints);

resetHints();
updateHintUsage();
loadProblemPreview();
