const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");

async function main() {
  const resources = path.resolve("resources");
  await fs.mkdir(resources, { recursive: true });

  const icon = await sharp("public/icons/mivo-icon-512.png")
    .resize(1024, 1024, { fit: "contain" })
    .png()
    .toBuffer();
  await fs.writeFile(path.join(resources, "icon-only.png"), icon);
  await fs.writeFile(path.join(resources, "icon-foreground.png"), icon);

  await sharp({
    create: { width: 1024, height: 1024, channels: 4, background: "#080a0d" },
  })
    .png()
    .toFile(path.join(resources, "icon-background.png"));

  const logo = await sharp("public/brand/mivo-capital-logo-transparent.png")
    .resize({ width: 2200, height: 1100, fit: "inside" })
    .png()
    .toBuffer();
  for (const name of ["splash.png", "splash-dark.png"]) {
    await sharp({
      create: { width: 2732, height: 2732, channels: 4, background: "#080a0d" },
    })
      .composite([{ input: logo, gravity: "center" }])
      .png()
      .toFile(path.join(resources, name));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
