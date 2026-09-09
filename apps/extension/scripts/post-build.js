import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extRoot = path.resolve(__dirname, "..");
const distDir = path.resolve(extRoot, "dist");

// 1. Copy and adapt manifest.json
const manifestPath = path.join(extRoot, "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

manifest.background = {
  service_worker: "src/background/index.js",
  type: "module"
};

manifest.content_scripts = [
  {
    matches: ["*://*.1688.com/*"],
    js: ["src/content/index.js"],
    run_at: "document_end"
  }
];

manifest.side_panel = {
  default_path: "src/sidepanel/index.html"
};

fs.writeFileSync(path.join(distDir, "manifest.json"), JSON.stringify(manifest, null, 2));

// 2. Copy icons to dist/icons
const iconsSrc = path.join(extRoot, "icons");
const iconsDist = path.join(distDir, "icons");
if (fs.existsSync(iconsSrc)) {
  if (!fs.existsSync(iconsDist)) fs.mkdirSync(iconsDist, { recursive: true });
  fs.readdirSync(iconsSrc).forEach(file => {
    fs.copyFileSync(path.join(iconsSrc, file), path.join(iconsDist, file));
  });
}

console.log("✅ Extension dist prepared successfully! Ready to load unpacked into Chrome.");
