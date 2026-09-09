import { build } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extRoot = path.resolve(__dirname, "..");
const distDir = path.resolve(extRoot, "dist");

async function runBuild() {
  console.log("🔨 [1/3] Building Side Panel (React App) & Background Service Worker...");
  await build({
    configFile: false,
    root: extRoot,
    plugins: [react()],
    build: {
      outDir: distDir,
      emptyOutDir: true,
      rollupOptions: {
        input: {
          sidepanel: path.resolve(extRoot, "src/sidepanel/index.html"),
          background: path.resolve(extRoot, "src/background/service-worker.ts")
        },
        output: {
          entryFileNames: "src/[name]/index.js",
          chunkFileNames: "assets/[name].[hash].js",
          assetFileNames: "assets/[name].[ext]"
        }
      }
    }
  });

  console.log("🔨 [2/3] Building Content Script as standalone self-contained IIFE bundle...");
  await build({
    configFile: false,
    root: extRoot,
    build: {
      outDir: distDir,
      emptyOutDir: false,
      lib: {
        entry: path.resolve(extRoot, "src/content/index.ts"),
        name: "ContentScript1688",
        formats: ["iife"],
        fileName: () => "src/content/index.js"
      },
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
          extend: true
        }
      }
    }
  });

  console.log("🔨 [3/3] Preparing manifest.json & static assets...");
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

  const iconsSrc = path.join(extRoot, "icons");
  const iconsDist = path.join(distDir, "icons");
  if (fs.existsSync(iconsSrc)) {
    if (!fs.existsSync(iconsDist)) fs.mkdirSync(iconsDist, { recursive: true });
    fs.readdirSync(iconsSrc).forEach(file => {
      fs.copyFileSync(path.join(iconsSrc, file), path.join(iconsDist, file));
    });
  }

  console.log("🎉 Extension build finished successfully! dist/src/content/index.js is ready for Chrome.");
}

runBuild().catch(err => {
  console.error("Build failed:", err);
  process.exit(1);
});
