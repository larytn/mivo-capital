import type { CapacitorConfig } from "@capacitor/cli";

// The hosted site is used for an internal mobile preview so web deployments
// are reflected immediately. Before store submission, replace this remote
// preview with the native app's bundled frontend and remove `server.url`.
const previewUrl = new URL(
  process.env.CAPACITOR_APP_URL ?? "https://mivo-capital.vercel.app/dashboard",
);

const config: CapacitorConfig = {
  appId: "com.mivocapital.app",
  appName: "Mivo Capital",
  webDir: "mobile-shell",
  backgroundColor: "#080a0d",
  server: {
    url: previewUrl.toString(),
    cleartext: false,
    allowNavigation: [previewUrl.hostname],
  },
  ios: {
    contentInset: "automatic",
    backgroundColor: "#080a0d",
  },
};

export default config;
