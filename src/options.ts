(function () {
  interface ButtonConfig {
    label: string;
    url: string;
    includeId?: boolean;
  }

  const STORAGE_KEY = "buttons";
  const SHOW_OPEN_ALL_KEY = "showOpenAll";

  const list = document.getElementById("button-list") as HTMLDivElement;
  const addButton = document.getElementById("add-button") as HTMLButtonElement;
  const saveButton = document.getElementById(
    "save-button"
  ) as HTMLButtonElement;
  const status = document.getElementById("status") as HTMLParagraphElement;
  const showOpenAllToggle = document.getElementById(
    "show-open-all"
  ) as HTMLInputElement;

  function sanitizeUrl(url: string): string {
    const trimmed = (url || "").trim();
    if (trimmed.endsWith("/")) {
      return trimmed.slice(0, -1);
    }
    return trimmed;
  }

  function setIdButtonState(button: HTMLButtonElement, enabled: boolean): void {
    button.dataset.includeId = String(enabled);
    button.classList.toggle("active", enabled);
    button.textContent = enabled ? "/steamid ✓" : "/steamid";
  }

  function createRow(value?: ButtonConfig): HTMLDivElement {
    const row = document.createElement("div");
    row.className = "button-row";

    const labelInput = document.createElement("input");
    labelInput.type = "text";
    labelInput.placeholder = "Label";
    labelInput.value = value?.label ?? "";
    labelInput.className = "text-input label-input";

    const urlInput = document.createElement("input");
    urlInput.type = "url";
    urlInput.placeholder = "https://example.com";
    urlInput.value = value?.url ?? "";
    urlInput.className = "text-input url-input";

    const addIdBtn = document.createElement("button");
    addIdBtn.type = "button";
    addIdBtn.className = "ghost add-id-btn";
    setIdButtonState(addIdBtn, value?.includeId !== false);
    addIdBtn.addEventListener("click", () => {
      const isEnabled = addIdBtn.dataset.includeId !== "true";
      setIdButtonState(addIdBtn, isEnabled);
    });

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "Remove";
    removeBtn.className = "ghost";
    removeBtn.addEventListener("click", () => {
      row.remove();
      if (!list.children.length) {
        list.appendChild(createRow());
      }
    });

    row.append(labelInput, urlInput, addIdBtn, removeBtn);
    return row;
  }

  function readRows(): ButtonConfig[] {
    const buttons: ButtonConfig[] = [];

    Array.from(list.children).forEach((child) => {
      const inputs = child.querySelectorAll("input");
      const label = (inputs[0]?.value || "").trim();
      const url = sanitizeUrl(inputs[1]?.value || "");
      const idToggle = child.querySelector<HTMLButtonElement>(".add-id-btn");
      const includeId = idToggle?.dataset.includeId !== "false";
      if (url.length > 0) {
        buttons.push({ label, url, includeId });
      }
    });

    return buttons;
  }

  function showStatus(message: string): void {
    status.textContent = message;
    status.classList.add("visible");
    setTimeout(() => status.classList.remove("visible"), 1800);
  }

  async function loadFromStorage(): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.sync.get(
        { [STORAGE_KEY]: [], [SHOW_OPEN_ALL_KEY]: true },
        (result) => {
          const buttons = (result[STORAGE_KEY] as ButtonConfig[]) || [];
          list.innerHTML = "";

          if (buttons.length === 0) {
            list.appendChild(createRow());
          } else {
            buttons.forEach((btn) => list.appendChild(createRow(btn)));
          }

          showOpenAllToggle.checked = result[SHOW_OPEN_ALL_KEY] !== false;

          resolve();
        }
      );
    });
  }

  function hookEvents(): void {
    addButton.addEventListener("click", () => {
      list.appendChild(createRow());
      list.lastElementChild?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });

    saveButton.addEventListener("click", () => {
      const buttons = readRows();
      chrome.storage.sync.set(
        {
          [STORAGE_KEY]: buttons,
          [SHOW_OPEN_ALL_KEY]: showOpenAllToggle.checked,
        },
        () => {
        showStatus(
          buttons.length ? "Saved to Chrome Sync" : "Cleared (no buttons saved)"
        );
        }
      );
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    hookEvents();
    loadFromStorage().catch((err) => {
      console.error("Failed to load button config", err);
      showStatus("Could not load saved buttons");
    });
  });
})();
