const os = require("node:os");

try {
  os.userInfo();
} catch {
  os.userInfo = () => ({ shell: process.env.COMSPEC || "cmd.exe" });
}

require("../node_modules/@capacitor/assets/bin/capacitor-assets");
