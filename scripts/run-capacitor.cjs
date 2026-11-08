const os = require("node:os");

try {
  os.userInfo();
} catch {
  // Capacitor only reads `shell` from this object. Some managed Windows
  // environments deny the native user lookup, so provide the normal shell.
  os.userInfo = () => ({ shell: process.env.COMSPEC || "cmd.exe" });
}

require("../node_modules/@capacitor/cli/bin/capacitor");
