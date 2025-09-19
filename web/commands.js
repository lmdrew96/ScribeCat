const noopController = {
  open() {},
  close() {},
  toggle() { return false; },
  setCommands() {},
  isOpen() {
    return false;
  },
};

function ensureFocusable(element) {
  if (element && !element.hasAttribute("tabindex")) {
    element.setAttribute("tabindex", "-1");
  }
}

function normalizeKeywords(value) {
  if (!value) return "";
  if (Array.isArray(value)) {
    return value.join(" ");
  }
  return String(value);
}

function normalizeCommand(command) {
  const labelGetter =
    typeof command.label === "function"
      ? command.label
      : () => (command.label ? String(command.label) : "Unnamed command");
  const descriptionGetter =
    typeof command.description === "function"
      ? command.description
      : () => (command.description ? String(command.description) : "");
  const shortcutGetter =
    typeof command.shortcut === "function"
      ? command.shortcut
      : () => (command.shortcut ? String(command.shortcut) : "");
  const visibility =
    typeof command.isVisible === "function"
      ? command.isVisible
      : () => command.hidden !== true;
  const enabled =
    typeof command.isEnabled === "function"
      ? command.isEnabled
      : () => command.disabled !== true;
  const runner = typeof command.run === "function" ? command.run : () => {};
  const keywords = normalizeKeywords(command.keywords || command.search).toLowerCase();
  const baseId = command.id || labelGetter().toLowerCase().replace(/\s+/g, "-");

  return {
    id: baseId,
    getLabel: labelGetter,
    getDescription: descriptionGetter,
    getShortcut: shortcutGetter,
    isVisible: visibility,
    isEnabled: enabled,
    run: runner,
    keywords,
  };
}

export function initCommandPalette(root = document) {
  const overlay = root.querySelector("[data-command-palette]");
  if (!overlay) {
    return noopController;
  }

  const doc = overlay.ownerDocument || root;
  const panel = overlay.querySelector(".command-palette__panel");
  const backdrop = overlay.querySelector(".command-palette__backdrop");
  const closeButton = overlay.querySelector("[data-command-close]");
  const input = overlay.querySelector("[data-command-input]");
  const list = overlay.querySelector("[data-command-list]");
  const emptyState = overlay.querySelector("[data-command-empty]");
  const openers = Array.from(root.querySelectorAll("[data-command-open]"));

  if (input && !input.hasAttribute("aria-expanded")) {
    input.setAttribute("aria-expanded", "false");
  }

  ensureFocusable(panel);

  overlay.hidden = true;
  overlay.classList.remove("is-open");
  overlay.setAttribute("aria-hidden", "true");

  let isOpen = false;
  let commands = [];
  let filtered = [];
  let activeIndex = -1;
  let lastTrigger = null;
  let previousBodyOverflow = null;

  function focusElement(element) {
    if (!element || typeof element.focus !== "function") return;
    try {
      element.focus({ preventScroll: true });
    } catch (error) {
      element.focus();
    }
  }

  function lockScroll() {
    if (!doc?.body) return;
    previousBodyOverflow = doc.body.style.overflow;
    doc.body.style.overflow = "hidden";
  }

  function unlockScroll() {
    if (!doc?.body) return;
    if (previousBodyOverflow != null) {
      doc.body.style.overflow = previousBodyOverflow;
    } else {
      doc.body.style.removeProperty("overflow");
    }
    previousBodyOverflow = null;
  }

  function getFilterTerm() {
    return (input?.value || "").trim().toLowerCase();
  }

  function getActiveCommand() {
    if (activeIndex < 0 || activeIndex >= filtered.length) return null;
    return filtered[activeIndex];
  }

  function updateActiveDescendant() {
    const options = list?.querySelectorAll("[data-command-index]") || [];
    options.forEach((option) => {
      option.classList.remove("is-active");
      option.setAttribute("aria-selected", "false");
    });
    if (activeIndex < 0 || activeIndex >= filtered.length) {
      if (input) {
        input.removeAttribute("aria-activedescendant");
      }
      return;
    }
    const activeOption = list?.querySelector(`[data-command-index="${activeIndex}"]`);
    if (activeOption) {
      activeOption.classList.add("is-active");
      activeOption.setAttribute("aria-selected", "true");
      if (input) {
        input.setAttribute("aria-activedescendant", activeOption.id);
      }
      activeOption.scrollIntoView({ block: "nearest" });
    }
  }

  function buildOption(command, index) {
    const button = doc.createElement("button");
    button.type = "button";
    button.id = `command-${command.id}-${index}`;
    button.className = "command-palette__command";
    button.dataset.commandIndex = String(index);
    button.dataset.commandAction = "execute";
    button.setAttribute("role", "option");

    const enabled = command.isEnabled();
    if (!enabled) {
      button.setAttribute("aria-disabled", "true");
    }

    const labelWrap = doc.createElement("span");
    labelWrap.className = "command-palette__command-label";

    const labelText = doc.createElement("span");
    labelText.textContent = command.getLabel();
    labelWrap.appendChild(labelText);

    const description = command.getDescription();
    if (description) {
      const desc = doc.createElement("span");
      desc.className = "command-palette__command-description";
      desc.textContent = description;
      labelWrap.appendChild(desc);
    }

    button.appendChild(labelWrap);

    const shortcut = command.getShortcut();
    if (shortcut) {
      const shortcutEl = doc.createElement("span");
      shortcutEl.className = "command-palette__command-shortcut";
      shortcutEl.textContent = shortcut;
      button.appendChild(shortcutEl);
    }

    return button;
  }

  function renderList() {
    if (!list) return;
    list.innerHTML = "";
    if (filtered.length === 0) {
      if (emptyState) {
        emptyState.hidden = false;
      }
      activeIndex = -1;
      updateActiveDescendant();
      return;
    }
    if (emptyState) {
      emptyState.hidden = true;
    }
    filtered.forEach((command, index) => {
      const option = buildOption(command, index);
      list.appendChild(option);
    });
    activeIndex = filtered.findIndex((command) => command.isEnabled());
    if (activeIndex < 0 && filtered.length > 0) {
      activeIndex = 0;
    }
    updateActiveDescendant();
  }

  function applyFilter() {
    const term = getFilterTerm();
    filtered = commands.filter((command) => {
      if (!command.isVisible()) return false;
      if (!term) return true;
      const haystack = [
        command.getLabel(),
        command.getDescription(),
        command.getShortcut(),
        command.keywords,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
    renderList();
  }

  function executeCommand(index) {
    const command = filtered[index];
    if (!command || !command.isEnabled()) {
      return;
    }
    close();
    try {
      command.run();
    } catch (error) {
      console.error("Command execution failed", error);
    }
  }

  function moveSelection(delta) {
    if (filtered.length === 0) return;
    let nextIndex = activeIndex;
    const maxIterations = filtered.length;
    for (let i = 0; i < maxIterations; i += 1) {
      nextIndex = (nextIndex + delta + filtered.length) % filtered.length;
      if (filtered[nextIndex].isEnabled()) {
        activeIndex = nextIndex;
        updateActiveDescendant();
        return;
      }
    }
  }

  function open(trigger) {
    if (isOpen) return;
    const active = doc.activeElement;
    if (trigger instanceof HTMLElement) {
      lastTrigger = trigger;
    } else if (active instanceof HTMLElement) {
      lastTrigger = active;
    } else {
      lastTrigger = null;
    }
    isOpen = true;
    overlay.hidden = false;
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    lockScroll();
    if (input) {
      input.value = "";
      input.setAttribute("aria-expanded", "true");
    }
    applyFilter();
    requestAnimationFrame(() => {
      if (input) {
        focusElement(input);
      } else if (panel) {
        focusElement(panel);
      }
    });
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    overlay.classList.remove("is-open");
    overlay.hidden = true;
    overlay.setAttribute("aria-hidden", "true");
    unlockScroll();
    if (input) {
      input.setAttribute("aria-expanded", "false");
    }
    const target = lastTrigger;
    lastTrigger = null;
    if (target) {
      focusElement(target);
    }
  }

  function toggle(force, trigger) {
    if (typeof force === "boolean") {
      if (force) {
        open(trigger);
      } else {
        close();
      }
      return isOpen;
    }
    if (isOpen) {
      close();
    } else {
      open(trigger);
    }
    return isOpen;
  }

  function setCommands(nextCommands) {
    commands = Array.isArray(nextCommands) ? nextCommands.map(normalizeCommand) : [];
    applyFilter();
  }

  function handleKeydown(event) {
    if (!isOpen) return;
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (activeIndex >= 0) {
        executeCommand(activeIndex);
      }
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveSelection(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveSelection(-1);
    }
  }

  if (input) {
    input.addEventListener("input", applyFilter);
    input.addEventListener("keydown", handleKeydown);
  }

  if (list) {
    list.addEventListener("click", (event) => {
      const button = event.target.closest("[data-command-action]");
      if (!button) return;
      const index = Number.parseInt(button.getAttribute("data-command-index"), 10);
      if (Number.isInteger(index)) {
        executeCommand(index);
      }
    });
  }

  doc.addEventListener("keydown", (event) => {
    if (!isOpen) return;
    if (event.target === input) return;
    handleKeydown(event);
  });

  if (backdrop) {
    backdrop.addEventListener("click", () => {
      close();
    });
  }

  if (closeButton) {
    closeButton.addEventListener("click", (event) => {
      event.preventDefault();
      close();
    });
  }

  openers.forEach((opener) => {
    opener.addEventListener("click", (event) => {
      event.preventDefault();
      toggle(true, event.currentTarget);
    });
  });

  return {
    open,
    close,
    toggle,
    setCommands,
    isOpen: () => isOpen,
  };
}
