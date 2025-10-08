const DEMO_KEY = "demoMode";

export const getDemoMode = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(DEMO_KEY) === "1";
  } catch {
    return false;
  }
};

export const setDemoMode = (on: boolean) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DEMO_KEY, on ? "1" : "0");
  } catch {}
};

function banner(msg: string) {
  if (typeof document === "undefined") return;
  const el = document.createElement("div");
  el.textContent = msg;
  el.style.position = "fixed";
  el.style.bottom = "16px";
  el.style.right = "16px";
  el.style.padding = "8px 12px";
  el.style.borderRadius = "8px";
  el.style.background = "rgba(16,185,129,0.95)";
  el.style.color = "white";
  el.style.font = "12px ui-sans-serif, system-ui, -apple-system";
  el.style.zIndex = "2147483647";
  document.body.appendChild(el);
  window.setTimeout(() => el.remove(), 1600);
}

export function installDemoDevHooks() {
  if (typeof window === "undefined") return;

  (window as any).DEMO = {
    enable: () => {
      setDemoMode(true);
      banner("Demo: ON");
    },
    disable: () => {
      setDemoMode(false);
      banner("Demo: OFF");
    },
    status: () => getDemoMode(),
  };

  try {
    const url = new URL(window.location.href);
    const v = url.searchParams.get("demo");
    if (v === "1") {
      setDemoMode(true);
      banner("Demo: ON (via URL)");
    }
    if (v === "0") {
      setDemoMode(false);
      banner("Demo: OFF (via URL)");
    }
  } catch {}

  window.addEventListener(
    "keydown",
    (e: KeyboardEvent) => {
      const metaOrCtrl = e.metaKey || e.ctrlKey;
      // Secret hotkey: Cmd/Ctrl + Shift + E
      if (metaOrCtrl && e.shiftKey && (e.key === "E" || e.key === "e")) {
        const next = !getDemoMode();
        setDemoMode(next);
        banner(next ? "Demo: ON (hotkey)" : "Demo: OFF (hotkey)");
      }
    },
    { passive: true }
  );
}

export const initDemoGlobals = (speakers: any[]) => {
  if (typeof window === "undefined") return;
  (window as any).__DEMO_SPEAKERS__ = speakers;
};



