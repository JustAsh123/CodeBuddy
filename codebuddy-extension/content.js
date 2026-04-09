function getProblemData() {
  const title =
    document.querySelector('[data-cy="question-title"]')?.innerText?.trim() ||
    document.querySelector("div.text-title-large a")?.innerText?.trim() ||
    "";

  const descriptionContainer =
    document.querySelector('[data-track-load="description_content"]') ||
    document.querySelector('[data-key="description-content"]') ||
    document.querySelector("div.elfjS");

  const description = descriptionContainer?.innerText?.trim() || "";

  let code = "";
  const editor = document.querySelector(".monaco-editor");

  if (editor) {
    const lines = editor.querySelectorAll(".view-line");
    code = Array.from(lines)
      .map((line) => line.innerText)
      .join("\n")
      .trim();
  }

  return { title, description, code };
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "GET_DATA") {
    const data = getProblemData();
    console.log("Sending problem data:", data);
    sendResponse(data);
  }
});
