"use strict";
(function () {
    const STORAGE_KEY = "buttons";
    const list = document.getElementById("button-list");
    const addButton = document.getElementById("add-button");
    const saveButton = document.getElementById("save-button");
    const status = document.getElementById("status");
    function setIdButtonState(button, enabled) {
        button.dataset.includeId = String(enabled);
        button.classList.toggle("active", enabled);
        button.textContent = enabled ? "/steamid ✓" : "/steamid";
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
    function readRows() {
        const buttons = [];
        Array.from(list.children).forEach((child) => {
            var _a, _b;
            const inputs = child.querySelectorAll("input");
            const label = (((_a = inputs[0]) === null || _a === void 0 ? void 0 : _a.value) || "").trim();
            const url = (((_b = inputs[1]) === null || _b === void 0 ? void 0 : _b.value) || "").trim();
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
            chrome.storage.sync.get({ [STORAGE_KEY]: [] }, (result) => {
                const buttons = result[STORAGE_KEY] || [];
                list.innerHTML = "";
                if (buttons.length === 0) {
                    list.appendChild(createRow());
                }
                else {
                    buttons.forEach((btn) => list.appendChild(createRow(btn)));
                }
                resolve();
            });
        });
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
        saveButton.addEventListener("click", () => {
            const buttons = readRows();
            chrome.storage.sync.set({ [STORAGE_KEY]: buttons }, () => {
                showStatus(buttons.length ? "Saved to Chrome Sync" : "Cleared (no buttons saved)");
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
