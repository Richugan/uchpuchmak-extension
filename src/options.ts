(function () {
  interface ButtonConfig {
    label: string;
    url: string;
    includeId?: boolean;
  }

  const STORAGE_KEY = "buttons";
  const SHOW_OPEN_ALL_KEY = "showOpenAll";
  const DRAGGING_CLASS = "dragging";
  let draggingRow: HTMLDivElement | null = null;

  const list = document.getElementById("button-list") as HTMLDivElement;
  const addButton = document.getElementById("add-button") as HTMLButtonElement;
  const saveButton = document.getElementById(
    "save-button"
  ) as HTMLButtonElement;
  const exportButton = document.getElementById(
    "export-button"
  ) as HTMLButtonElement;
  const importButton = document.getElementById(
    "import-button"
  ) as HTMLButtonElement;
  const importInput = document.getElementById(
    "import-input"
  ) as HTMLInputElement;
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
    button.textContent = enabled ? "/ID64 ✓" : "/ID64";
  }

  function normalizeButtons(raw: ButtonConfig[]): ButtonConfig[] {
    return (raw || [])
      .filter((btn) => btn && typeof btn.url === "string")
      .map((btn) => ({
        label: (btn.label || "").trim(),
        url: sanitizeUrl(btn.url),
        includeId: btn.includeId !== false,
      }))
      .filter((btn) => btn.url.length > 0);
  }

  function createRow(value?: ButtonConfig): HTMLDivElement {
    const row = document.createElement("div");
    row.className = "button-row";

    const dragHandle = document.createElement("button");
    dragHandle.type = "button";
    dragHandle.className = "ghost drag-handle";
    dragHandle.title = "Drag to reorder";
    dragHandle.setAttribute("aria-label", "Drag to reorder");
    const dragIcon = document.createElement("span");
    dragIcon.className = "drag-icon";
    dragHandle.appendChild(dragIcon);

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
    removeBtn.className = "ghost remove-btn";
    const removeIcon = document.createElement("span");
    removeIcon.className = "remove-icon";
    removeBtn.appendChild(removeIcon);
    removeBtn.addEventListener("click", () => {
      row.remove();
      if (!list.children.length) {
        list.appendChild(createRow());
      }
    });

    row.append(dragHandle, labelInput, urlInput, addIdBtn, removeBtn);
    setupDragAndDrop(row, dragHandle);
    return row;
  }

  function setButtonRows(buttons: ButtonConfig[]): void {
    list.innerHTML = "";
    if (!buttons.length) {
      list.appendChild(createRow());
      return;
    }

    buttons.forEach((btn) => list.appendChild(createRow(btn)));
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
          setButtonRows(normalizeButtons(buttons));

          showOpenAllToggle.checked = result[SHOW_OPEN_ALL_KEY] !== false;

          resolve();
        }
      );
    });
  }

  function exportConfig(): void {
    const payload = {
      buttons: readRows(),
      showOpenAll: showOpenAllToggle.checked,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "steam-custom-buttons.json";
    anchor.click();
    URL.revokeObjectURL(url);
    showStatus("Exported JSON");
  }

  function handleImport(data: unknown): void {
    if (!data || typeof data !== "object") {
      throw new Error("Invalid JSON");
    }

    const parsed = data as {
      buttons?: ButtonConfig[];
      showOpenAll?: boolean;
    };

    const buttons = normalizeButtons(parsed.buttons || []);
    const showOpenAll = parsed.showOpenAll !== false;

    setButtonRows(buttons);
    showOpenAllToggle.checked = showOpenAll;

    chrome.storage.sync.set(
      { [STORAGE_KEY]: buttons, [SHOW_OPEN_ALL_KEY]: showOpenAll },
      () => {
        showStatus("Imported & saved");
      }
    );
  }

  async function importConfig(file: File): Promise<void> {
    const text = await file.text();
    const json = JSON.parse(text);
    handleImport(json);
  }

  function setupDragAndDrop(
    row: HTMLDivElement,
    handle: HTMLButtonElement
  ): void {
    handle.draggable = true;

    handle.addEventListener("dragstart", (event) => {
      draggingRow = row;
      row.classList.add(DRAGGING_CLASS);
      event.dataTransfer?.setData("text/plain", "");
      event.dataTransfer?.setDragImage(row, 25, 25);
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
      }
    });

    handle.addEventListener("dragend", () => {
      row.classList.remove(DRAGGING_CLASS);
      draggingRow = null;
    });
  }

  function handleListDragOver(event: DragEvent): void {
    if (!draggingRow) {
      return;
    }

    event.preventDefault();
    const afterRow = getRowAfter(list, event.clientY);
    if (!afterRow) {
      list.appendChild(draggingRow);
    } else if (afterRow !== draggingRow) {
      list.insertBefore(draggingRow, afterRow);
    }
  }

  function getRowAfter(
    container: HTMLElement,
    y: number
  ): HTMLDivElement | null {
    const eligible = Array.from(
      container.querySelectorAll<HTMLDivElement>(".button-row")
    ).filter((row) => row !== draggingRow);

    let closest: { offset: number; element: HTMLDivElement | null } = {
      offset: Number.NEGATIVE_INFINITY,
      element: null,
    };

    eligible.forEach((row) => {
      const rect = row.getBoundingClientRect();
      const offset = y - rect.top - rect.height / 2;
      if (offset < 0 && offset > closest.offset) {
        closest = { offset, element: row };
      }
    });

    return closest.element;
  }

  function hookEvents(): void {
    addButton.addEventListener("click", () => {
      list.appendChild(createRow());
      list.lastElementChild?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });

    exportButton.addEventListener("click", () => {
      exportConfig();
    });

    importButton.addEventListener("click", () => {
      importInput.click();
    });

    importInput.addEventListener("change", () => {
      const file = importInput.files?.[0];
      if (!file) {
        return;
      }

      importConfig(file).catch((error) => {
        console.error("Failed to import JSON", error);
        showStatus("Could not import file");
      });

      importInput.value = "";
    });

    list.addEventListener("dragover", handleListDragOver);
    list.addEventListener("drop", (event) => event.preventDefault());

    saveButton.addEventListener("click", () => {
      const buttons = readRows();
      chrome.storage.sync.set(
        {
          [STORAGE_KEY]: buttons,
          [SHOW_OPEN_ALL_KEY]: showOpenAllToggle.checked,
        },
        () => {
          showStatus(
            buttons.length
              ? "Saved to Chrome Sync"
              : "Cleared (no buttons saved)"
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
