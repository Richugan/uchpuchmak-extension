"use strict";
(function () {
    const STORAGE_KEY = "buttons";
    const SHOWCASE_ID = "steam-custom-link-showcase";
    const SHOW_OPEN_ALL_KEY = "showOpenAll";
    const OPEN_ALL_ID = `${SHOWCASE_ID}-open-all`;
    const STORAGE_DEFAULTS = {
        [STORAGE_KEY]: [],
        [SHOW_OPEN_ALL_KEY]: true,
    };
    let currentSettings = { buttons: [], showOpenAll: true };
    function sanitizeUrl(url) {
        const trimmed = (url || "").trim();
        if (trimmed.endsWith("/")) {
            return trimmed.slice(0, -1);
        }
        return trimmed;
    }
    function truncate(value, max = 60) {
        if (value.length <= max) {
            return value;
        }
        return `${value.slice(0, max - 3)}...`;
    }
    function normalizeButtons(raw) {
        return (raw || [])
            .filter((btn) => btn && typeof btn.url === "string")
            .map((btn) => ({
            label: (btn.label || "").trim() || (btn.url || "").trim(),
            url: sanitizeUrl(btn.url),
            includeId: btn.includeId !== false,
        }))
            .filter((btn) => btn.url.length > 0);
    }
    function buildSettings(raw) {
        return {
            buttons: normalizeButtons(raw[STORAGE_KEY]),
            showOpenAll: raw[SHOW_OPEN_ALL_KEY] !== false,
        };
    }
    async function loadSettings() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(STORAGE_DEFAULTS, (result) => {
                const settings = buildSettings(result);
                currentSettings = settings;
                resolve(settings);
            });
        });
    }
    function getProfilePath() {
        return window.location.href.replace("https://steamcommunity.com", "");
    }
    function getButtonHref(button) {
        const profileId = getProfilePath();
        return button.includeId !== false ? button.url + profileId : button.url;
    }
    function findShowcasesContainer() {
        // Typical Steam profile markup wraps showcases in .profile_showcases or .profile_customization_area.
        const container = document.querySelector(".profile_showcases") ||
            document.querySelector(".profile_customization_area") ||
            document.querySelector("#profile_customization");
        if (container) {
            return container;
        }
        // If no showcases exist yet, create a customization container in the left column.
        const leftColumn = document.querySelector(".profile_leftcol");
        if (!leftColumn) {
            return null;
        }
        const fallback = document.createElement("div");
        fallback.className = "profile_customization_area";
        leftColumn.insertBefore(fallback, leftColumn.firstChild);
        return fallback;
    }
    function buildButton(button) {
        const anchor = document.createElement("a");
        anchor.className = "custom-link-btn";
        anchor.href = getButtonHref(button);
        anchor.target = "_blank";
        anchor.rel = "noreferrer noopener";
        const display = button.label || truncate(button.url);
        anchor.textContent = display;
        return anchor;
    }
    function injectStyles() {
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
      #${SHOWCASE_ID} .custom-links-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      }
      #${SHOWCASE_ID} .custom-link-btn:hover {
        background: rgba(102,192,244,0.12);
        border-color: rgba(102,192,244,0.4);
        transform: translateY(-1px);
      }
      #${SHOWCASE_ID} .custom-link-btn:active {
        transform: translateY(0);
      }
      #${SHOWCASE_ID} .custom-button-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }
      #${SHOWCASE_ID} .open-all-btn {
        cursor: pointer;
        padding: 4px 3px 4px 6px;
      }
    `;
        document.head.appendChild(style);
    }
    function renderButtons(settings) {
        const parent = findShowcasesContainer();
        if (!parent) {
            return;
        }
        const existing = document.getElementById(SHOWCASE_ID);
        if (existing) {
            existing.remove();
        }
        if (settings.buttons.length === 0) {
            return;
        }
        const showcase = document.createElement("div");
        showcase.id = SHOWCASE_ID;
        showcase.className = "profile_customization";
        const header = document.createElement("div");
        header.className = "profile_customization_header custom-links-header";
        header.textContent = "Custom Links";
        const grid = document.createElement("div");
        grid.className = "custom-button-grid profile_customization_block";
        if (settings.showOpenAll) {
            const openAll = document.createElement("button");
            openAll.type = "button";
            openAll.id = OPEN_ALL_ID;
            openAll.className = "custom-link-btn open-all-btn";
            openAll.textContent = "Open All 🡥";
            openAll.addEventListener("click", () => {
                settings.buttons.forEach((btn) => {
                    const href = getButtonHref(btn);
                    if (href) {
                        window.open(href, "_blank", "noopener,noreferrer");
                    }
                });
            });
            header.appendChild(openAll);
        }
        settings.buttons.forEach((button) => grid.appendChild(buildButton(button)));
        showcase.append(header, grid);
        // Place near top of showcases if possible for visibility.
        if (parent.firstChild) {
            parent.insertBefore(showcase, parent.firstChild);
        }
        else {
            parent.appendChild(showcase);
        }
    }
    async function init() {
        injectStyles();
        const settings = await loadSettings();
        renderButtons(settings);
    }
    function setupChangeListener() {
        chrome.storage.onChanged.addListener((changes, areaName) => {
            if (areaName !== "sync") {
                return;
            }
            let dirty = false;
            const nextSettings = { ...currentSettings };
            if (changes[STORAGE_KEY]) {
                const newButtons = changes[STORAGE_KEY].newValue;
                nextSettings.buttons = normalizeButtons(newButtons);
                dirty = true;
            }
            if (changes[SHOW_OPEN_ALL_KEY]) {
                nextSettings.showOpenAll =
                    changes[SHOW_OPEN_ALL_KEY].newValue !== false;
                dirty = true;
            }
            if (dirty) {
                currentSettings = nextSettings;
                renderButtons(nextSettings);
            }
        });
    }
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            init().catch((error) => console.error("Custom Steam buttons failed to init", error));
        });
    }
    else {
        init().catch((error) => console.error("Custom Steam buttons failed to init", error));
    }
    setupChangeListener();
})();
