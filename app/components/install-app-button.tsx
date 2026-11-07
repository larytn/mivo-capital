"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function InstallAppButton() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in window.navigator && Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone));
    setInstalled(standalone);
    setIos(/iPhone|iPad|iPod/.test(window.navigator.userAgent) ||
      (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1));

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      setShowGuide(false);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  async function install() {
    if (!installPrompt) {
      setShowGuide(true);
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setInstallPrompt(null);
  }

  return <>
    <button type="button" onClick={install} className="workspace-install-button">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 16v4h14v-4" /></svg>
      <span>Install app</span>
    </button>
    {showGuide && <div className="install-guide-scrim" onMouseDown={(event) => {
      if (event.target === event.currentTarget) setShowGuide(false);
    }}>
      <section className="install-guide" role="dialog" aria-modal="true" aria-labelledby="install-guide-title">
        <button type="button" className="install-guide-close" aria-label="Close" onClick={() => setShowGuide(false)}>×</button>
        <p className="install-guide-kicker">MIVO CAPITAL</p>
        <h2 id="install-guide-title">Add Mivo to your phone</h2>
        {ios ? <ol>
          <li>Open this page in Safari.</li>
          <li>Tap the Share button.</li>
          <li>Choose <strong>Add to Home Screen</strong>, then tap Add.</li>
        </ol> : <ol>
          <li>Open your browser menu.</li>
          <li>Choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>
          <li>Confirm to add Mivo to your home screen.</li>
        </ol>}
        <p className="install-guide-note">The installed app uses the same Mivo account and updates when the website is deployed.</p>
      </section>
    </div>}
  </>;
}
