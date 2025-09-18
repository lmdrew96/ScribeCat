const controllers = new WeakMap();

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type=\"hidden\"])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex=\"-1\"])"
].join(",");

function isFocusable(element) {
  if (!(element instanceof HTMLElement)) return false;
  if (element.hasAttribute("disabled")) return false;
  if (element.getAttribute("aria-hidden") === "true") return false;
  return true;
}

function getFocusable(dialog) {
  const nodes = dialog.querySelectorAll(FOCUSABLE_SELECTOR);
  return Array.from(nodes).filter((node) => isFocusable(node));
}

function ensureDialogFocusable(dialog) {
  if (!dialog.hasAttribute("tabindex")) {
    dialog.setAttribute("tabindex", "-1");
  }
}

export function initHotkeysModal(root = document) {
  const overlay = root.querySelector('[data-modal="hotkeys"]');
  if (!overlay) return null;
  if (controllers.has(overlay)) {
    return controllers.get(overlay);
  }

  const dialog = overlay.querySelector('[data-modal-dialog]');
  if (!dialog) {
    return null;
  }

  const doc = overlay.ownerDocument || root;
  const closeButtons = Array.from(overlay.querySelectorAll('[data-modal-close]'));
  const openers = Array.from(root.querySelectorAll('[data-modal-open="hotkeys"]'));

  ensureDialogFocusable(dialog);
  overlay.hidden = true;
  overlay.classList.remove("is-open");
  overlay.setAttribute("aria-hidden", "true");

  let isOpen = false;
  let lastFocusedElement = null;
  let previousBodyOverflow = null;

  function focusElement(element) {
    if (!element || typeof element.focus !== "function") return;
    try {
      element.focus({ preventScroll: true });
    } catch (error) {
      element.focus();
    }
  }

  function focusFirstElement() {
    const focusable = getFocusable(dialog);
    const target = focusable[0] || dialog;
    focusElement(target);
  }

  function lockScroll() {
    if (!doc || !doc.body) return;
    previousBodyOverflow = doc.body.style.overflow;
    doc.body.style.overflow = "hidden";
  }

  function unlockScroll() {
    if (!doc || !doc.body) return;
    if (previousBodyOverflow != null) {
      doc.body.style.overflow = previousBodyOverflow;
    } else {
      doc.body.style.removeProperty("overflow");
    }
    previousBodyOverflow = null;
  }

  function handleTabKey(event) {
    const focusable = getFocusable(dialog);
    if (focusable.length === 0) {
      event.preventDefault();
      focusElement(dialog);
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = doc.activeElement;
    if (event.shiftKey) {
      if (active === first || !dialog.contains(active)) {
        event.preventDefault();
        last.focus();
      }
    } else if (active === last || !dialog.contains(active)) {
      event.preventDefault();
      first.focus();
    }
  }

  function handleDocumentKeydown(event) {
    if (!isOpen) return;
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === "Tab") {
      handleTabKey(event);
      return;
    }
  }

  function handleDocumentFocusIn(event) {
    if (!isOpen) return;
    if (dialog.contains(event.target)) return;
    event.stopPropagation();
    focusFirstElement();
  }

  function open(trigger) {
    if (isOpen) return;
    const active = doc.activeElement;
    if (trigger instanceof HTMLElement && typeof trigger.focus === "function") {
      lastFocusedElement = trigger;
    } else if (active instanceof HTMLElement) {
      lastFocusedElement = active;
    } else {
      lastFocusedElement = null;
    }
    isOpen = true;
    overlay.hidden = false;
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    lockScroll();
    doc.addEventListener("keydown", handleDocumentKeydown, true);
    doc.addEventListener("focusin", handleDocumentFocusIn, true);
    requestAnimationFrame(() => {
      focusFirstElement();
    });
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    doc.removeEventListener("keydown", handleDocumentKeydown, true);
    doc.removeEventListener("focusin", handleDocumentFocusIn, true);
    overlay.classList.remove("is-open");
    overlay.hidden = true;
    overlay.setAttribute("aria-hidden", "true");
    unlockScroll();
    const target = lastFocusedElement;
    lastFocusedElement = null;
    focusElement(target);
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

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      close();
    }
  });

  closeButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      close();
    });
  });

  openers.forEach((opener) => {
    opener.addEventListener("click", (event) => {
      event.preventDefault();
      toggle(true, event.currentTarget);
    });
  });

  const controller = {
    open: (trigger) => open(trigger),
    close,
    toggle: (force, trigger) => toggle(force, trigger),
    isOpen: () => isOpen,
  };

  controllers.set(overlay, controller);
  return controller;
}
