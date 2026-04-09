const pageInfo = document.getElementById("pageInfo");
const codeInput = document.getElementById("codeInput");
const getHintBtn = document.getElementById("getHintBtn");
const statusEl = document.getElementById("status");

const outputFields = {
  analysis: document.getElementById("analysis"),
  mistake: document.getElementById("mistake"),
  hint1: document.getElementById("hint1"),
  hint2: document.getElementById("hint2"),
  hint3: document.getElementById("hint3"),
};

function setStatus(message) {
  statusEl.textContent = message;
}

function setOutput(data = {}) {
  outputFields.analysis.textContent = data.analysis || "";
  outputFields.mistake.textContent = data.mistake || "";
  outputFields.hint1.textContent = data.hint1 || "";
  outputFields.hint2.textContent = data.hint2 || "";
  outputFields.hint3.textContent = data.hint3 || "";
}

function setProblemData(title, description, code) {
  if (title) {
    pageInfo.textContent = title;
    setStatus("");
  } else {
    pageInfo.textContent = "Open a LeetCode problem";
  }

  if (typeof code === "string") {
    codeInput.value = code;
  }
}

function requestProblemPreview() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs?.[0];

    if (!activeTab?.id || !activeTab.url?.startsWith("https://leetcode.com/problems/")) {
      setProblemData("", "", "");
      setStatus("Open a LeetCode problem");
      return;
    }

    chrome.tabs.sendMessage(activeTab.id, { type: "GET_DATA" }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Preview message error:", chrome.runtime.lastError.message);
        setStatus("Open a LeetCode problem");
        return;
      }

      console.log("Received preview from content:", response);

      if (!response) {
        setStatus("Open a LeetCode problem");
        return;
      }

      setProblemData(response.title, response.description, response.code);
    });
  });
}

document.getElementById("getHintBtn").addEventListener("click", async () => {
  console.log("Button clicked");
  setStatus("Getting hints...");
  setOutput({});
  getHintBtn.disabled = true;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs?.[0];

    if (!activeTab?.id || !activeTab.url?.startsWith("https://leetcode.com/problems/")) {
      getHintBtn.disabled = false;
      setStatus("");
      alert("No data found. Open a LeetCode problem.");
      return;
    }

    chrome.tabs.sendMessage(activeTab.id, { type: "GET_DATA" }, async (response) => {
      console.log("Received from content:", response);

      if (chrome.runtime.lastError) {
        console.error("Content message error:", chrome.runtime.lastError.message);
        getHintBtn.disabled = false;
        setStatus("Failed to fetch hints");
        alert("No data found. Open a LeetCode problem.");
        return;
      }

      if (!response) {
        getHintBtn.disabled = false;
        setStatus("");
        alert("No data found. Open a LeetCode problem.");
        return;
      }

      const { title, description, code } = response;
      setProblemData(title, description, code);

      if (!code?.trim()) {
        getHintBtn.disabled = false;
        setStatus("");
        alert("No code found in the editor.");
        return;
      }

      try {
        const res = await fetch("http://localhost:3000/get-hints", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            problem: `${title}\n${description}`,
            user_code: code,
            user_approach: "",
          }),
        });

        if (!res.ok) {
          throw new Error("Request failed");
        }

        const data = await res.json();
        console.log("API Response:", data);

        document.getElementById("analysis").innerText = data.analysis || "";
        document.getElementById("mistake").innerText = data.mistake || "";
        document.getElementById("hint1").innerText = data.hint1 || "";
        document.getElementById("hint2").innerText = data.hint2 || "";
        document.getElementById("hint3").innerText = data.hint3 || "";
        setStatus("");
      } catch (err) {
        console.error("Fetch error:", err);
        setStatus("Failed to fetch hints");
        alert("Failed to fetch hints");
      } finally {
        getHintBtn.disabled = false;
      }
    });
  });
});

requestProblemPreview();
