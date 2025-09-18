const statusEls = {
  internet: document.getElementById("statusInternet"),
  static: document.getElementById("statusStatic"),
  app: document.getElementById("statusApp"),
};

const versionEls = {
  product: document.getElementById("devShellProduct"),
  version: document.getElementById("devShellVersion"),
};

const FALLBACK_PRODUCT = "ScribeCat";
const FALLBACK_VERSION = "0.1.0";

function setStatus(el, state, text) {
  if (!el) return;
  el.textContent = text;
  el.classList.remove("is-ok", "is-bad", "is-warn");
  if (state) {
    el.classList.add(state);
  }
}

function applyVersion(productName, version) {
  if (versionEls.product) {
    versionEls.product.textContent = productName || FALLBACK_PRODUCT;
  }
  if (versionEls.version) {
    versionEls.version.textContent = version || FALLBACK_VERSION;
  }
}

async function loadVersion() {
  try {
    const res = await fetch("/version.json", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      const productName = (data?.productName || "").trim();
      const version = (data?.version || "").trim();
      applyVersion(productName || FALLBACK_PRODUCT, version || FALLBACK_VERSION);
      return;
    }
  } catch (err) {
    console.debug("version.json unavailable", err);
  }
  applyVersion(FALLBACK_PRODUCT, FALLBACK_VERSION);
}

async function checkInternet() {
  setStatus(statusEls.internet, "is-warn", "checking…");
  try {
    await fetch("https://example.com/", { mode: "no-cors" });
    setStatus(statusEls.internet, "is-ok", "reachable");
  } catch (err) {
    console.debug("internet check failed", err);
    setStatus(statusEls.internet, "is-bad", "unreachable");
  }
}

async function checkStaticServer() {
  setStatus(statusEls.static, "is-warn", "checking…");
  try {
    const res = await fetch("/index.html", { cache: "no-store" });
    if (res.ok) {
      setStatus(statusEls.static, "is-ok", "ok");
    } else {
      setStatus(statusEls.static, "is-bad", "down");
    }
  } catch (err) {
    console.debug("static server check failed", err);
    setStatus(statusEls.static, "is-bad", "down");
  }
}

function markAppReady() {
  setStatus(statusEls.app, "is-ok", "ready");
}

function initAppStatus() {
  setStatus(statusEls.app, "is-warn", "loading…");
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", markAppReady, { once: true });
  } else {
    markAppReady();
  }
}

loadVersion();
checkInternet();
checkStaticServer();
initAppStatus();
