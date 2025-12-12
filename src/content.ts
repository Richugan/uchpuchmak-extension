(function () {
  interface ButtonConfig {
    label: string;
    url: string;
  }

  const STORAGE_KEY = "buttons";
  const SHOWCASE_ID = "steam-custom-link-showcase";

  async function loadButtons(): Promise<ButtonConfig[]> {
    return new Promise((resolve) => {
      chrome.storage.sync.get({ [STORAGE_KEY]: [] }, (result) => {
        const stored = (result[STORAGE_KEY] as ButtonConfig[]) || [];
        const sanitized = stored
          .filter((btn) => btn && typeof btn.url === "string")
          .map((btn) => ({
            label: (btn.label || "").trim() || (btn.url || "").trim(),
            url: (btn.url || "").trim(),
          }))
          .filter((btn) => btn.url.length > 0);
        resolve(sanitized);
      });
    });
  }

  function findShowcasesContainer(): HTMLElement | null {
    // Typical Steam profile markup wraps showcases in .profile_showcases or .profile_customization_area.
    const container =
      document.querySelector<HTMLElement>(".profile_showcases") ||
      document.querySelector<HTMLElement>(".profile_customization_area") ||
      document.querySelector<HTMLElement>("#profile_customization");
    return container;
  }

  function buildButton(button: ButtonConfig): HTMLAnchorElement {
    const profileId = window.location.href.replace(
      "https://steamcommunity.com",
      ""
    );
    const anchor = document.createElement("a");
    anchor.className = "custom-link-btn";
    anchor.href = button.url + profileId;
    anchor.target = "_blank";
    anchor.rel = "noreferrer noopener";
    anchor.textContent = button.label || button.url;
    return anchor;
  }

  function injectStyles(): void {
    if (document.getElementById(`${SHOWCASE_ID}-styles`)) {
      return;
    }

    const style = document.createElement("style");
    style.id = `${SHOWCASE_ID}-styles`;
    style.textContent = `
      #${SHOWCASE_ID} {
        position: relative;
        border-radius: 4px;
        border: 1px solid rgba(255,255,255,0.08);
        margin-bottom: 12px;
        box-shadow: 0 12px 28px rgba(0,0,0,0.35);
      }
      #${SHOWCASE_ID} .custom-button-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }
      #${SHOWCASE_ID} .custom-link-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 10px 12px;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.08);
        color: #e5f0ff;
        text-decoration: none;
        border-radius: 3px;
        font-weight: 600;
        transition: border-color 0.16s ease, background 0.16s ease, transform 0.08s ease;
        word-break: break-word;
      }
      #${SHOWCASE_ID} .custom-link-btn:hover {
        background: rgba(102,192,244,0.12);
        border-color: rgba(102,192,244,0.4);
        transform: translateY(-1px);
      }
      #${SHOWCASE_ID} .custom-link-btn:active {
        transform: translateY(0);
      }
    `;

    document.head.appendChild(style);
  }

  function renderButtons(buttons: ButtonConfig[]): void {
    const parent = findShowcasesContainer();
    if (!parent) {
      return;
    }

    const existing = document.getElementById(SHOWCASE_ID);
    if (existing) {
      existing.remove();
    }

    if (buttons.length === 0) {
      return;
    }

    const showcase = document.createElement("div");
    showcase.id = SHOWCASE_ID;
    showcase.className = "profile_customization";

    const header = document.createElement("div");
    header.className = "profile_customization_header";
    header.textContent = "Custom Links";

    const grid = document.createElement("div");
    grid.className = "custom-button-grid profile_customization_block";
    buttons.forEach((button) => grid.appendChild(buildButton(button)));

    showcase.append(header, grid);

    // Place near top of showcases if possible for visibility.
    if (parent.firstChild) {
      parent.insertBefore(showcase, parent.firstChild);
    } else {
      parent.appendChild(showcase);
    }
  }

  async function init(): Promise<void> {
    injectStyles();
    const buttons = await loadButtons();
    renderButtons(buttons);
  }

  function setupChangeListener(): void {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "sync" || !changes[STORAGE_KEY]) {
        return;
      }

      const newButtons = changes[STORAGE_KEY].newValue as ButtonConfig[];
      renderButtons(
        (newButtons || []).map((btn) => ({
          label: (btn.label || "").trim() || (btn.url || "").trim(),
          url: (btn.url || "").trim(),
        }))
      );
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      init().catch((error) =>
        console.error("Custom Steam buttons failed to init", error)
      );
    });
  } else {
    init().catch((error) =>
      console.error("Custom Steam buttons failed to init", error)
    );
  }

  setupChangeListener();
})();
