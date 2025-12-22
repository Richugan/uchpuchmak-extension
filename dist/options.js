"use strict";
(function () {
    const STORAGE_KEY = "buttons";
    const SHOW_OPEN_ALL_KEY = "showOpenAll";
    const list = document.getElementById("button-list");
    const addButton = document.getElementById("add-button");
    const saveButton = document.getElementById("save-button");
    const exportButton = document.getElementById("export-button");
    const importButton = document.getElementById("import-button");
    const importInput = document.getElementById("import-input");
    const status = document.getElementById("status");
    const showOpenAllToggle = document.getElementById("show-open-all");
    function sanitizeUrl(url) {
        const trimmed = (url || "").trim();
        if (trimmed.endsWith("/")) {
            return trimmed.slice(0, -1);
        }
        return trimmed;
    }
    function setIdButtonState(button, enabled) {
        button.dataset.includeId = String(enabled);
        button.classList.toggle("active", enabled);
        button.textContent = enabled ? "/steamid ✓" : "/steamid";
    }
    function normalizeButtons(raw) {
        return (raw || [])
            .filter((btn) => btn && typeof btn.url === "string")
            .map((btn) => ({
            label: (btn.label || "").trim(),
            url: sanitizeUrl(btn.url),
            includeId: btn.includeId !== false,
        }))
            .filter((btn) => btn.url.length > 0);
    }
    function createRow(value) {
        var _a, _b;
        const row = document.createElement("div");
        row.className = "button-row";
        const labelInput = document.createElement("input");
        labelInput.type = "text";
        labelInput.placeholder = "Label";
        labelInput.value = (_a = value === null || value === void 0 ? void 0 : value.label) !== null && _a !== void 0 ? _a : "";
        labelInput.className = "text-input label-input";
        const urlInput = document.createElement("input");
        urlInput.type = "url";
        urlInput.placeholder = "https://example.com";
        urlInput.value = (_b = value === null || value === void 0 ? void 0 : value.url) !== null && _b !== void 0 ? _b : "";
        urlInput.className = "text-input url-input";
        const addIdBtn = document.createElement("button");
        addIdBtn.type = "button";
        addIdBtn.className = "ghost add-id-btn";
        setIdButtonState(addIdBtn, (value === null || value === void 0 ? void 0 : value.includeId) !== false);
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
    function setButtonRows(buttons) {
        list.innerHTML = "";
        if (!buttons.length) {
            list.appendChild(createRow());
            return;
        }
        buttons.forEach((btn) => list.appendChild(createRow(btn)));
    }
    function readRows() {
        const buttons = [];
        Array.from(list.children).forEach((child) => {
            var _a, _b;
            const inputs = child.querySelectorAll("input");
            const label = (((_a = inputs[0]) === null || _a === void 0 ? void 0 : _a.value) || "").trim();
            const url = sanitizeUrl(((_b = inputs[1]) === null || _b === void 0 ? void 0 : _b.value) || "");
            const idToggle = child.querySelector(".add-id-btn");
            const includeId = (idToggle === null || idToggle === void 0 ? void 0 : idToggle.dataset.includeId) !== "false";
            if (url.length > 0) {
                buttons.push({ label, url, includeId });
            }
        });
        return buttons;
    }
    function showStatus(message) {
        status.textContent = message;
        status.classList.add("visible");
        setTimeout(() => status.classList.remove("visible"), 1800);
    }
    async function loadFromStorage() {
        return new Promise((resolve) => {
            chrome.storage.sync.get({ [STORAGE_KEY]: [], [SHOW_OPEN_ALL_KEY]: true }, (result) => {
                const buttons = result[STORAGE_KEY] || [];
                setButtonRows(normalizeButtons(buttons));
                showOpenAllToggle.checked = result[SHOW_OPEN_ALL_KEY] !== false;
                resolve();
            });
        });
    }
    function exportConfig() {
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
    function handleImport(data) {
        if (!data || typeof data !== "object") {
            throw new Error("Invalid JSON");
        }
        const parsed = data;
        const buttons = normalizeButtons(parsed.buttons || []);
        const showOpenAll = parsed.showOpenAll !== false;
        setButtonRows(buttons);
        showOpenAllToggle.checked = showOpenAll;
        chrome.storage.sync.set({ [STORAGE_KEY]: buttons, [SHOW_OPEN_ALL_KEY]: showOpenAll }, () => {
            showStatus("Imported & saved");
        });
    }
    async function importConfig(file) {
        const text = await file.text();
        const json = JSON.parse(text);
        handleImport(json);
    }
    function hookEvents() {
        addButton.addEventListener("click", () => {
            var _a;
            list.appendChild(createRow());
            (_a = list.lastElementChild) === null || _a === void 0 ? void 0 : _a.scrollIntoView({
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
            var _a;
            const file = (_a = importInput.files) === null || _a === void 0 ? void 0 : _a[0];
            if (!file) {
                return;
            }
            importConfig(file).catch((error) => {
                console.error("Failed to import JSON", error);
                showStatus("Could not import file");
            });
            importInput.value = "";
        });
        saveButton.addEventListener("click", () => {
            const buttons = readRows();
            chrome.storage.sync.set({
                [STORAGE_KEY]: buttons,
                [SHOW_OPEN_ALL_KEY]: showOpenAllToggle.checked,
            }, () => {
                showStatus(buttons.length
                    ? "Saved to Chrome Sync"
                    : "Cleared (no buttons saved)");
            });
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
