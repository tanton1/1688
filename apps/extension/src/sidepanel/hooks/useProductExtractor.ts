import { useState, useEffect, useRef } from "react";
import { Raw1688Product } from "@hub1688/shared-types";
import { apiFetch } from "../../shared/config.js";

/**
 * Hàm tìm kiếm Tab Web đang hoạt động trên trình duyệt Chrome (hỗ trợ đa cửa sổ & Side Panel)
 */
async function findActiveWebTab(): Promise<chrome.tabs.Tab | null> {
  if (typeof chrome === "undefined" || !chrome.tabs) return null;

  try {
    // 1. Kiểm tra tab active trong cửa sổ hiện tại
    const currentTabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (currentTabs[0]?.id && currentTabs[0]?.url && /^https?:\/\//.test(currentTabs[0].url)) {
      return currentTabs[0];
    }

    // 2. Kiểm tra tab active trong cửa sổ vừa focus gần nhất
    const lastFocused = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (lastFocused[0]?.id && lastFocused[0]?.url && /^https?:\/\//.test(lastFocused[0].url)) {
      return lastFocused[0];
    }

    // 3. Quét tất cả active tab trên toàn bộ các cửa sổ trình duyệt
    const allActive = await chrome.tabs.query({ active: true });
    const webActive = allActive.find(t => t.id && t.url && /^https?:\/\//.test(t.url));
    if (webActive) return webActive;

    // 4. Fallback: tìm tab web bất kỳ đang mở
    const allTabs = await chrome.tabs.query({});
    const anyWeb = allTabs.find(t => t.id && t.url && /^https?:\/\//.test(t.url));
    return anyWeb || null;
  } catch (e) {
    console.warn("[Sidepanel] Error querying active tabs:", e);
    return null;
  }
}

function comparableProductUrl(value: string): string {
  try {
    const parsed = new URL(value);
    return `${parsed.origin}${parsed.pathname.replace(/\/$/, "")}`;
  } catch {
    return value;
  }
}

async function waitForTabComplete(tabId: number): Promise<void> {
  const current = await chrome.tabs.get(tabId);
  if (current.status === "complete") return;

  await new Promise<void>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(onUpdated);
      reject(new Error("Trang nguồn tải quá thời gian cho phép"));
    }, 20000);
    const onUpdated = (updatedTabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
      if (updatedTabId !== tabId || changeInfo.status !== "complete") return;
      window.clearTimeout(timeoutId);
      chrome.tabs.onUpdated.removeListener(onUpdated);
      resolve();
    };
    chrome.tabs.onUpdated.addListener(onUpdated);
  });
}

/**
 * Hàm thực thi trực tiếp trên DOM của Tab để trích xuất thông số tức thời (Shopify .js, Schema.org, OpenGraph, DOM Tags)
 */
async function extractCommerceProductFromDom(): Promise<any> {
  try {
    const doc = document;
    const url = window.location.href;
    const pathname = window.location.pathname;

    const normalizeImageUrl = (value: any): string | undefined => {
      if (!value) return undefined;
      let image = String(value).trim();
      if (!image || image.startsWith("data:") || image.startsWith("blob:")) return undefined;
      if (image.startsWith("//")) image = "https:" + image;
      try { return new URL(image, window.location.href).href; } catch { return undefined; }
    };

    const inferImageLabel = (imageUrl?: string): string => {
      if (!imageUrl) return "";
      try {
        const fileName = (new URL(imageUrl, window.location.href).pathname.split("/").pop() || "")
          .replace(/%20/gi, " ")
          .replace(/\.[a-z0-9]+$/i, "");
        const semanticPart = fileName.includes("__") ? fileName.split("__").pop() || "" : fileName;
        return semanticPart
          .replace(/[_-]\d{6,}$/g, "")
          .replace(/[_-]+/g, " ")
          .replace(/\s+/g, " ")
          .trim();
      } catch {
        return "";
      }
    };

    // Customily/third-party personalization controls are rendered as live DOM
    // image swatches and are not included in Shopify's product JSON.
    const extractCustomOptionGroups = () => {
      const groups: Array<{
        id: string;
        name: string;
        kind: "PERSONALIZATION";
        inputType: "ASSET_PICKER" | "SELECT";
        required: boolean;
        source: "EXTERNAL_CUSTOMIZER";
        values: Array<{ id: string; label: string; imageUrl?: string; sourceValue?: string }>;
      }> = [];
      const containers = Array.from(doc.querySelectorAll(
        "#custom-options .ant-form-item, .personalized-form .ant-form-item, [data-personalization] .ant-form-item, #customily-options .customily_option, .customily-main-app .customily_option"
      ));
      for (const container of containers) {
        const labelEl = container.querySelector(".option_name") || container.querySelector(".ant-form-item-label label, .pb-form-item-label, [data-option-label], legend, label");
        const name = (labelEl?.getAttribute("title") || labelEl?.textContent || "")
          .replace(/\(\s*\d+\s*[|/]\s*\d+\s*\)/g, "")
          .replace(/\brequired\b/gi, "")
          .replace(/\*/g, "")
          .replace(/\s+/g, " ")
          .trim();
        if (!name || (/quantity|buy more|shipping/i.test(name) && !/choose|option|design|style/i.test(name))) continue;

        const values: Array<{ id: string; label: string; imageUrl?: string; sourceValue?: string }> = [];
        const swatches = Array.from(container.querySelectorAll(
          ".customily-swatch, .swatch-container .pb-tooltip, .swatch-container > div, [role=option], [role=radio], input[type=radio]"
        ));
        for (const swatch of swatches) {
          const imageEl = swatch.querySelector?.("img") as HTMLImageElement | null;
          const imageUrl = normalizeImageUrl(imageEl?.getAttribute("data-src") || imageEl?.getAttribute("data-original") || imageEl?.getAttribute("src"));
          const valueLabel = swatch.querySelector?.(".pb-tooltip-title, [data-value-label], [title], [aria-label]") as HTMLElement | null;
          const input = (swatch.tagName === "INPUT" ? swatch : swatch.querySelector?.("input[type=radio], input[type=checkbox]")) as HTMLInputElement | null;
          let resolvedImageUrl = imageUrl;
          if (!resolvedImageUrl) {
            const styled = (swatch.querySelector?.("[style*='background-image']") || swatch) as HTMLElement | null;
            const match = styled?.getAttribute("style")?.match(/background-image\s*:\s*url\(["']?([^"')]+)["']?\)/i);
            resolvedImageUrl = normalizeImageUrl(match?.[1]);
          }
          const label = (
            valueLabel?.getAttribute("title") || valueLabel?.getAttribute("aria-label") || valueLabel?.textContent ||
            input?.getAttribute("aria-label") || input?.value || imageEl?.alt || inferImageLabel(resolvedImageUrl) || swatch.getAttribute("data-value") ||
            swatch.getAttribute("title") || swatch.textContent || ""
          ).replace(/\s+/g, " ").trim();
          if (label && !values.some(value => value.label.toLowerCase() === label.toLowerCase())) {
            values.push({
              id: `${name}-${values.length + 1}`.toLowerCase().replace(/[^a-z0-9]+/gi, "-"),
              label,
              sourceValue: input?.value || swatch.getAttribute("data-value") || label,
              imageUrl: resolvedImageUrl
            });
          }
        }
        // Keep select-only customizer controls too. They are still customer
        // personalization and must remain outside the native SKU matrix.
        if (values.length >= 1) {
          groups.push({
            id: `custom-${groups.length + 1}`,
            name,
            kind: "PERSONALIZATION",
            inputType: values.some(value => Boolean(value.imageUrl)) ? "ASSET_PICKER" : "SELECT",
            required: true,
            source: "EXTERNAL_CUSTOMIZER",
            values
          });
        }
      }
      return groups;
    };

    const extractCustomizationEvidence = () => {
      const containers = Array.from(doc.querySelectorAll(
        "#custom-options, .personalized-form, [data-personalization], #customily-options, .customily-main-app"
      ));
      const textFields: Array<{
        id: string;
        label: string;
        type: "TEXT" | "TEXTAREA" | "IMAGE_UPLOAD";
        required?: boolean;
        maxLength?: number;
        accept?: string[];
      }> = [];
      const detectedLabels: string[] = [];
      containers.forEach(container => {
        container.querySelectorAll("input[type=text], input:not([type]), textarea, input[type=file]").forEach((control: any, index) => {
          const input = control as HTMLInputElement;
          const fieldContainer = input.closest(".ant-form-item, .customily_option, [data-personalization-field]") || input.parentElement;
          const labelEl = fieldContainer?.querySelector(".option_name, label, legend, [data-option-label]") as HTMLElement | null;
          const label = (labelEl?.textContent || input.getAttribute("aria-label") || input.getAttribute("placeholder") || "Nội dung cá nhân hóa")
            .replace(/\*/g, "").replace(/\s+/g, " ").trim();
          const type = input.type === "file" ? "IMAGE_UPLOAD" : input.tagName.toLowerCase() === "textarea" ? "TEXTAREA" : "TEXT";
          const id = input.id || input.name || `custom-field-${textFields.length + index + 1}`;
          if (!textFields.some(field => field.id === id)) {
            textFields.push({
              id,
              label,
              type,
              required: input.required || fieldContainer?.querySelector("[required]") !== null,
              maxLength: input.maxLength > 0 ? input.maxLength : undefined,
              accept: input.accept ? input.accept.split(",").map(value => value.trim()).filter(Boolean) : undefined
            });
            if (label && !detectedLabels.includes(label)) detectedLabels.push(label);
          }
        });
      });
      const customGroups = extractCustomOptionGroups();
      return {
        hasCustomTextInput: textFields.some(field => field.type === "TEXT" || field.type === "TEXTAREA"),
        hasImageUpload: textFields.some(field => field.type === "IMAGE_UPLOAD"),
        hasCustomerAssetPicker: customGroups.length > 0,
        detectedLabels,
        textFields,
        confidence: customGroups.length > 0 || textFields.length > 0 ? 0.95 : 0,
        reviewRequired: false
      };
    };

    // Macorner's Customily/MA Commerce app is loaded after Shopify and keeps
    // its personalization schema in a separate JSON endpoint. Shopify's
    // product JSON therefore contains only commercial SKUs (for example
    // 1-6 PCS), while Shape/Background/Flower/Name/Font and their artwork
    // assets live in the Medzt payload. Read that payload directly so custom
    // choices remain order-line data and never get multiplied into variants.
    const extractExternalCustomizer = async (shopifyData: any) => {
      if (!/macorner\.co$/i.test(window.location.hostname) || !pathname.includes("/products/")) return null;
      const handle = String(shopifyData?.handle || pathname.split("/products/")[1]?.split("/")[0] || "").split("?")[0].trim();
      if (!handle) return null;

      const scriptText = Array.from(doc.scripts).map(script => script.textContent || "").join("\n");
      const storeName = String((window as any).Shopify?.shop || scriptText.match(/Shopify\.shop\s*=\s*[\"']([^\"']+)[\"']/i)?.[1] || "").trim();
      if (!storeName) return null;

      const endpoints = [
        `https://sh.medzt.com/${storeName}/${handle}.json?v=2.0.48`,
        `https://api-prod.medzt.com/custom/${storeName}/${handle}.json?v=2.0.48`
      ];
      let config: any = null;
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, { credentials: "omit" });
          if (!response.ok) continue;
          const candidate = await response.json();
          if (candidate && (Array.isArray(candidate.clipartCategories) || Array.isArray(candidate.printAreas))) {
            config = candidate;
            break;
          }
        } catch {
          // Try the secondary Medzt endpoint before falling back to live DOM.
        }
      }
      if (!config) return null;

      const slugify = (value: string, fallback: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || fallback;
      const assetUrl = (key: any) => {
        if (!key || typeof key !== "string") return undefined;
        const value = key.trim();
        if (!value || value.startsWith("data:") || value.startsWith("blob:")) return undefined;
        if (/^https?:\/\//i.test(value)) return value;
        return `https://cdn.dztcloud.com/${value.replace(/^\/+/, "")}`;
      };
      const categories: any[] = Array.isArray(config.clipartCategories) ? config.clipartCategories : [];
      const categoryById = new Map(categories.map(category => [String(category?.id || ""), category]));
      const groups: any[] = [];
      const usedCategoryIds = new Set<string>();
      const textFields: any[] = [];
      const customImages: string[] = [];
      const addImage = (url: string | undefined) => {
        if (url && !customImages.includes(url)) customImages.push(url);
      };
      const addCategoryGroup = (category: any, label: string, categoryId?: string) => {
        if (!category || !Array.isArray(category.cliparts) || category.cliparts.length === 0) return;
        if ((categoryId && usedCategoryIds.has(categoryId)) || groups.some(group => group.name.toLowerCase() === label.toLowerCase())) return;
        const values: any[] = [];
        category.cliparts.forEach((clipart: any, index: number) => {
          const imageUrl = assetUrl(clipart?.thumbnail || clipart?.file?.key);
          const clipartLabel = String(clipart?.title || clipart?.name || `Tùy chọn ${index + 1}`).trim();
          if (!clipartLabel || values.some(value => value.label.toLowerCase() === clipartLabel.toLowerCase())) return;
          values.push({
            id: `${slugify(label, "custom")}-${slugify(clipartLabel, String(index + 1))}`,
            label: clipartLabel,
            sourceValue: String(clipart?.id || clipartLabel),
            imageUrl
          });
          addImage(imageUrl);
        });
        if (values.length === 0) return;
        groups.push({
          id: `custom-${slugify(label, String(groups.length + 1))}`,
          name: label,
          kind: "PERSONALIZATION",
          inputType: values.some(value => Boolean(value.imageUrl)) ? "ASSET_PICKER" : "SELECT",
          required: true,
          source: "EXTERNAL_CUSTOMIZER",
          values
        });
        if (categoryId) usedCategoryIds.add(categoryId);
      };

      // Walk every artwork template to recover the exact labels and required
      // flags used by the live customizer, including text layers.
      const layers: any[] = [];
      const collectLayers = (value: any) => {
        if (!value || typeof value !== "object") return;
        if (Array.isArray(value)) { value.forEach(collectLayers); return; }
        if (value.personalized && typeof value.personalized === "object") layers.push(value);
        Object.values(value).forEach(collectLayers);
      };
      collectLayers(config.printAreas || config.artworks || []);
      layers.forEach(layer => {
        const personalized = layer.personalized || {};
        const label = String(personalized.label || layer.title || "").replace(/\s+/g, " ").trim();
        const categoryId = String(personalized.clipartCategory || "").trim();
        if (personalized.type === "clipartCategory" && categoryId) {
          const category = categoryById.get(categoryId);
          if (category) addCategoryGroup(category, label || category.title || "Tùy chọn", categoryId);
          else if (/background/i.test(label)) {
            // Background categories are shape-dependent and some payloads only
            // expose their child categories (square/circle/lace). Flatten them
            // with a shape prefix so no custom artwork is silently dropped.
            const backgroundCategories = categories.filter(category => /square|circle|round/i.test(String(category?.title || "")) && Array.isArray(category?.cliparts));
            const flattened = backgroundCategories.flatMap(category => (category.cliparts || []).map((clipart: any) => ({ ...clipart, title: `${category.title}: ${clipart.title || clipart.name || "Tùy chọn"}` })));
            addCategoryGroup({ cliparts: flattened }, label || "Choose Background", categoryId);
          }
        }
        if (personalized.enable && personalized.type !== "clipartCategory" && /name|text|message|enter/i.test(label)) {
          const id = slugify(label, `custom-field-${textFields.length + 1}`);
          if (!textFields.some(field => field.id === id)) {
            textFields.push({
              id,
              label,
              type: "TEXT",
              required: personalized.required !== false,
              maxLength: Number(personalized.max || personalized.maxLength) > 0 ? Number(personalized.max || personalized.maxLength) : undefined,
              placeholder: personalized.placeholder || undefined,
              helpText: personalized.help || undefined
            });
          }
        }
      });

      // Include category-backed options that are not directly referenced by a
      // visible layer (common for shape-dependent background/font pickers).
      const likelyCategories = categories.filter(category => !usedCategoryIds.has(String(category?.id || "")) && Array.isArray(category?.cliparts) && category.cliparts.length > 0);
      likelyCategories.forEach(category => {
        const title = String(category?.title || "").trim();
        if (/flower|hoa/i.test(title) && !groups.some(group => /flower|hoa/i.test(group.name))) addCategoryGroup(category, "Choose Birth Flower", String(category.id));
        else if (/font/i.test(title) && !groups.some(group => /font/i.test(group.name))) addCategoryGroup(category, "Choose Font", String(category.id));
      });

      let customizerMockupTemplateUrl: string | undefined;
      const mockupKey = config.mockups?.[0]?.layers?.find((layer: any) => layer?.file?.key)?.file?.key;
      customizerMockupTemplateUrl = assetUrl(mockupKey);
      const evidence = {
        hasCustomTextInput: textFields.length > 0,
        hasImageUpload: false,
        hasCustomerAssetPicker: groups.some(group => group.inputType === "ASSET_PICKER"),
        detectedLabels: [...groups.map(group => group.name), ...textFields.map(field => field.label)],
        textFields,
        confidence: groups.length > 0 || textFields.length > 0 ? 0.98 : 0,
        reviewRequired: false
      };
      return { customOptionGroups: groups, customizationEvidence: evidence, customizerMockupTemplateUrl, customImages };
    };

    // Customily mounts its swatches asynchronously after the Shopify shell.
    // Give it a short window so opening the side panel immediately still gets
    // the option images instead of returning only the native quantity SKUs.
    if (/macorner\.co$/i.test(window.location.hostname) && pathname.includes("/products/") && extractCustomOptionGroups().length === 0) {
      await new Promise<void>(resolve => {
        const observer = new MutationObserver(() => {
          if (extractCustomOptionGroups().length > 0) {
            observer.disconnect();
            resolve();
          }
        });
        observer.observe(doc.documentElement, { childList: true, subtree: true });
        window.setTimeout(() => { observer.disconnect(); resolve(); }, 8000);
      });
    }

    // 1. Thử gọi API JSON của chính Shopify store ngay trên Tab (same-origin, cực sạch và chính xác 100%)
    if (pathname.includes("/products/")) {
      try {
        const cleanPath = pathname.split("?")[0].replace(/\/$/, "");
        const res = await fetch(`${cleanPath}.js`);
        if (res.ok) {
          const shopifyData = await res.json();
          if (shopifyData && (shopifyData.title || (Array.isArray(shopifyData.variants) && shopifyData.variants.length > 0))) {
            const imageMap: Record<number, string> = {};
            const cleanImages: string[] = (shopifyData.images || []).map((img: any) => {
              let s = typeof img === "string" ? img : img?.src || "";
              if (s.startsWith("//")) s = "https:" + s;
              if (typeof img === "object" && img?.id && s) {
                imageMap[img.id] = s;
              }
              return s;
            }).filter(Boolean);

            const normalizePrice = (p: number) => {
              if (typeof p !== "number" || !Number.isFinite(p) || p <= 0) return 0;
              return p >= 100 ? Math.round((p / 100) * 100) / 100 : p;
            };

            const rawVariants = (shopifyData.variants || []).map((v: any) => {
              let img = v.featured_image?.src || (typeof v.featured_image === "string" ? v.featured_image : undefined);
              if (!img && v.image_id && imageMap[v.image_id]) {
                img = imageMap[v.image_id];
              }
              if (img && img.startsWith("//")) img = "https:" + img;
              return {
                ...v,
                featured_image: img ? { src: img } : undefined
              };
            });

            const customGroups = extractCustomOptionGroups();
            const externalCustomizer = await extractExternalCustomizer(shopifyData);
            const shopifyOptions = (Array.isArray(shopifyData.options) ? shopifyData.options : [])
              .map((option: any, index: number) => ({
                name: String(typeof option === "string" ? option : (option?.name || `Option ${index + 1}`)).trim(),
                values: Array.isArray(option?.values)
                  ? option.values.map((value: any) => String(value).trim()).filter(Boolean)
                  : [...new Set(rawVariants.map((variant: any) => variant[`option${index + 1}`]).filter(Boolean).map((value: any) => String(value).trim()))]
              }))
              .filter((option: any) => option.values.length > 0);
            const baseOptionNames = new Set(shopifyOptions.map((option: any) => option.name.toLowerCase()));
            const mergedCustomGroups = [...customGroups, ...(externalCustomizer?.customOptionGroups || [])];
            const uniqueCustomGroups = mergedCustomGroups.filter((group, index, all) =>
              !baseOptionNames.has(group.name.toLowerCase()) && all.findIndex(candidate => candidate.name.toLowerCase() === group.name.toLowerCase()) === index
            );

            const mergedOptions = [...shopifyOptions];
            const customImages = [...new Set([
              ...uniqueCustomGroups.flatMap(group => group.values.map(value => value.imageUrl).filter(Boolean)),
              ...(externalCustomizer?.customImages || [])
            ])];
            const domCustomizationEvidence = extractCustomizationEvidence();
            const customizationEvidence = externalCustomizer?.customizationEvidence || domCustomizationEvidence;

            // Trích xuất hình ảnh mô tả chi tiết từ Shopify description / body_html
            const detailImages: string[] = [];
            const descHtml = shopifyData.body_html || shopifyData.description || "";
            if (descHtml) {
              const imgMatches = descHtml.match(/<img\b[^>]*\b(?:src|data-src)=["']((?:https?:)?\/\/[^"'\s>]+)["'][^>]*>/gi);
              if (imgMatches) {
                imgMatches.forEach((m: string) => {
                  const srcMatch = m.match(/(?:src|data-src)=["']((?:https?:)?\/\/[^"'\s>]+)["']/i);
                  if (srcMatch) {
                    let u = srcMatch[1].trim();
                    if (u.startsWith("//")) u = "https:" + u;
                    if (!detailImages.includes(u)) detailImages.push(u);
                  }
                });
              }
            }

            const prices = rawVariants.map((v: any) => normalizePrice(v.price)).filter((price: number) => price > 0);
            const priceMin = prices.length > 0 ? Math.min(...prices) : normalizePrice(shopifyData.price);
            const priceMax = prices.length > 0 ? Math.max(...prices) : priceMin;
            const productImages = [...new Set([
              ...(cleanImages.length > 0 ? cleanImages : [normalizeImageUrl(shopifyData.featured_image)]),
              ...customImages
            ].filter(Boolean))] as string[];

            if (!shopifyData.title?.trim() || productImages.length === 0 || priceMin <= 0) {
              return { error: "EXTRACTION_FAILED: Shopify JSON thiếu tiêu đề, ảnh hoặc giá xác thực" };
            }

            return {
              url,
              sourceProductId: String(shopifyData.id || shopifyData.handle || cleanPath),
              title: shopifyData.title,
              images: productImages,
              detailImages,
              price: priceMin,
              priceMin,
              priceMax,
              currency: "USD",
              shopName: shopifyData.vendor || window.location.hostname,
              description: shopifyData.description || "",
              options: mergedOptions,
              variants: rawVariants,
              customOptionGroups: uniqueCustomGroups,
              customizationEvidence,
              customizerMockupTemplateUrl: externalCustomizer?.customizerMockupTemplateUrl
            };
          }
        }
      } catch (e) {
        // Fallback sang DOM bóc tách
      }
    }

    // 2. Trích xuất mảng variants từ <script type="application/json"> trong DOM
    let domVariants: any[] = [];
    try {
      const jsonScripts = doc.querySelectorAll('script[type="application/json"]');
      for (const s of jsonScripts) {
        try {
          const parsed = JSON.parse(s.textContent || "");
          if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id && (parsed[0].title || parsed[0].price !== undefined)) {
            domVariants = parsed;
            break;
          }
        } catch {}
      }
    } catch {}

    // 3. Trích xuất JSON-LD Schema.org Product
    let schemaProduct: any = null;
    const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
    for (const s of scripts) {
      try {
        const parsed = JSON.parse(s.textContent || "{}");
        const item = Array.isArray(parsed)
          ? parsed.find((x: any) => x["@type"] === "Product")
          : (parsed["@type"] === "Product" ? parsed : null);
        if (item) {
          schemaProduct = item;
          break;
        }
      } catch {}
    }

    // 4. OpenGraph Meta Tags
    const ogTitle = doc.querySelector('meta[property="og:title"], meta[name="twitter:title"]')?.getAttribute("content")?.trim();
    const ogImage = doc.querySelector('meta[property="og:image:secure_url"], meta[property="og:image"], meta[name="twitter:image"]')?.getAttribute("content")?.trim();
    const ogPrice = doc.querySelector('meta[property="og:price:amount"], meta[property="product:price:amount"]')?.getAttribute("content")?.trim();
    const ogCurrency = doc.querySelector('meta[property="og:price:currency"], meta[property="product:price:currency"]')?.getAttribute("content")?.trim();
    const ogSiteName = doc.querySelector('meta[property="og:site_name"]')?.getAttribute("content")?.trim();
    const ogDesc = doc.querySelector('meta[property="og:description"], meta[name="description"]')?.getAttribute("content")?.trim();

    // 5. Tiêu đề
    const title = schemaProduct?.name || ogTitle || doc.querySelector("h1")?.innerText?.trim() || doc.title?.split(/[-|_|–]/)[0]?.trim();

    // 6. Hình ảnh có bộ lọc rác nghiêm ngặt
    const images: string[] = [];
    const JUNK_IMG_REGEX = /(?:icon|logo|badge|banner|trust|payment|flag|avatar|review|rating|star|arrow|svg|rec_|recommend|related|cart|checkout|halloween_badge|search-|img-menu|default-img|footer|header|menu|\/assets\/)/i;

    const addImg = (src: string | null | undefined) => {
      if (!src) return;
      let clean = src.trim();
      if (clean.startsWith("//")) clean = "https:" + clean;
      if ((clean.startsWith("http://") || clean.startsWith("https://")) && !JUNK_IMG_REGEX.test(clean)) {
        clean = clean.replace(/_\d+x\d+.*$/, "").replace(/\.32x32\..*$/, ".800x800.");
        if (!images.includes(clean)) images.push(clean);
      }
    };

    // Ưu tiên ảnh từ variants
    if (domVariants.length > 0) {
      domVariants.forEach(v => {
        let img = v.featured_image?.src || (typeof v.featured_image === "string" ? v.featured_image : null);
        if (img) addImg(img);
      });
    }

    if (schemaProduct?.image) {
      if (Array.isArray(schemaProduct.image)) schemaProduct.image.forEach(addImg);
      else addImg(schemaProduct.image);
    }
    addImg(ogImage);

    // Chỉ quét ảnh trong khối gallery sản phẩm (loại bỏ vùng recommendations, footer, header)
    doc.querySelectorAll(".product__media img, .product-single__photo img, .product-gallery img, .pdp-image-gallery img, [data-media-id] img").forEach((el: any) => {
      if (el.closest?.(".recommendations, .related-products, .product-recommendations, footer, header, nav, .cart")) return;
      addImg(el.getAttribute("data-src") || el.getAttribute("zoom-src") || el.src);
    });

    // 7. Giá & Tiền tệ
    let price = 0;
    let currency = "USD";
    if (schemaProduct?.offers) {
      const offers = Array.isArray(schemaProduct.offers) ? schemaProduct.offers[0] : schemaProduct.offers;
      if (offers) {
        price = parseFloat(offers.price || offers.lowPrice || "0") || 0;
        if (offers.priceCurrency) currency = offers.priceCurrency.toUpperCase();
      }
    }
    if (!price && ogPrice) {
      price = parseFloat(ogPrice.replace(/[^0-9.]/g, "")) || 0;
    }
    if (ogCurrency) currency = ogCurrency.toUpperCase();

    if (!price) {
      const priceEls = doc.querySelectorAll(".price-item--regular, .price-item--sale, .product__price, [data-product-price], .price");
      for (const el of priceEls) {
        const txt = (el as HTMLElement).innerText || "";
        if (txt.includes("₫") || txt.includes("đ") || txt.includes("VND")) currency = "VND";
        else if (txt.includes("$") || txt.includes("USD")) currency = "USD";
        else if (txt.includes("¥") || txt.includes("￥")) currency = "CNY";
        const val = parseFloat(txt.replace(/[^0-9.,]/g, "").replace(",", "."));
        if (!isNaN(val) && val > 0) {
          price = val;
          break;
        }
      }
    }

    const shopName = schemaProduct?.brand?.name || ogSiteName || window.location.hostname;

    // Trích xuất hình ảnh mô tả DOM (Detail Images)
    const domDetailImages: string[] = [];
    doc.querySelectorAll(".product__description img, .rte img, #description img, .description img, [class*='description'] img, .product-description img").forEach((img: any) => {
      let s = img.getAttribute("data-src") || img.getAttribute("data-lazyload-src") || img.getAttribute("data-original") || img.src;
      if (s) {
        if (s.startsWith("//")) s = "https:" + s;
        if (!JUNK_IMG_REGEX.test(s) && !domDetailImages.includes(s)) domDetailImages.push(s);
      }
    });

    if (!title || title.length < 3 || images.length === 0 || price <= 0) {
      return { error: "EXTRACTION_FAILED: DOM thiếu tiêu đề, ảnh hoặc giá xác thực" };
    }

    const pathId = pathname.split("/").filter(Boolean).pop() || window.location.hostname;
    const genericCustomOptionGroups = extractCustomOptionGroups();
    const genericCustomizationEvidence = extractCustomizationEvidence();
    return {
      url,
      sourceProductId: String(schemaProduct?.sku || pathId).slice(0, 128),
      title,
      images: images.slice(0, 15),
      detailImages: domDetailImages,
      price,
      currency: currency || "USD",
      shopName,
      description: schemaProduct?.description || ogDesc || "",
      variants: domVariants,
      customOptionGroups: genericCustomOptionGroups,
      customizationEvidence: genericCustomizationEvidence
    };
  } catch (err: any) {
    return { error: err.message };
  }
}

export function useProductExtractor() {
  const [product, setProduct] = useState<Raw1688Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string>("");
  const lastProcessedUrlRef = useRef<string>("");

  const extractByCustomUrl = async (inputUrl: string) => {
    const cleanUrl = inputUrl.trim();
    if (!cleanUrl || (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://"))) {
      setError("Vui lòng nhập đường dẫn URL hợp lệ (bắt đầu bằng https://)");
      return;
    }

    setLoading(true);
    setError(null);
    setCurrentUrl(cleanUrl);

    try {
      // A pasted Macorner URL needs a real browser DOM. The backend can read
      // Shopify's .js endpoint but cannot see asynchronously rendered
      // personalization swatches and their CDN images.
      if (typeof chrome !== "undefined" && chrome.tabs && chrome.scripting && /(?:^|\.)macorner\.co$/i.test(new URL(cleanUrl).hostname) && /\/products\//i.test(new URL(cleanUrl).pathname)) {
        let temporaryTabId: number | undefined;
        try {
          const expectedUrl = comparableProductUrl(cleanUrl);
          const openTabs = await chrome.tabs.query({});
          let sourceTab = openTabs.find(tab => tab.id && tab.url && comparableProductUrl(tab.url) === expectedUrl);

          if (!sourceTab?.id) {
            sourceTab = await chrome.tabs.create({ url: cleanUrl, active: false });
            temporaryTabId = sourceTab.id;
          }

          if (sourceTab.id) {
            await waitForTabComplete(sourceTab.id);
            const results = await chrome.scripting.executeScript({
              target: { tabId: sourceTab.id },
              func: extractCommerceProductFromDom
            });
            const domData = results?.[0]?.result;
            if (domData && !domData.error && domData.title?.length > 2 && domData.images?.length > 0 && Number(domData.price) > 0) {
              setProduct(convertDomDataToRawProduct(domData, cleanUrl));
              setError(null);
              return;
            }
          }
        } catch (domError) {
          console.warn("[Sidepanel] Pasted Macorner DOM extraction warning:", domError);
        } finally {
          if (temporaryTabId) {
            try { await chrome.tabs.remove(temporaryTabId); } catch {}
          }
        }
      }

      const prevRes = await apiFetch("/api/v1/clone/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: cleanUrl })
      });
      const prevData = await prevRes.json();
      if (prevData?.success && prevData?.preview?.extractionStatus === "LIVE" && !prevData.preview.isDemo) {
        setProduct(convertClonePreviewToRawProduct(prevData.preview, cleanUrl));
        setError(null);
      } else {
        setProduct(null);
        setError(prevData?.error || "EXTRACTION_UNVERIFIED: Dữ liệu từ URL chưa đủ tin cậy để nhập.");
      }
    } catch (e: any) {
      setError(`Lỗi kết nối máy chủ: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchProductData = async (force: boolean = false) => {
    setLoading(true);
    setError(null);

    // 1. Môi trường Chrome Extension
    if (typeof chrome !== "undefined" && chrome.tabs) {
      try {
        const tab = await findActiveWebTab();

        if (tab?.url) {
          const tabUrl = tab.url;
          setCurrentUrl(tabUrl);

          // Tránh gọi lại nhiều lần nếu URL không đổi (trừ khi force = true)
          if (!force && tabUrl === lastProcessedUrlRef.current && product) {
            setLoading(false);
            return;
          }
          lastProcessedUrlRef.current = tabUrl;

          const isMacornerProduct = /macorner\.co\//i.test(tabUrl) && /\/products\//i.test(tabUrl);

          // Macorner's Customily choices are mounted outside Shopify's native
          // variant array. Prefer the injected DOM extractor on this platform
          // so an old/stale content script cannot return only the six quantity
          // SKUs and hide the eight design images.
          const tryDomInjection = async (): Promise<boolean> => {
            if (!tab.id || !chrome.scripting) return false;
            try {
              const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: extractCommerceProductFromDom
              });
              const domData = results?.[0]?.result;
              if (domData && !domData.error && domData.title?.length > 2 && domData.images?.length > 0 && Number(domData.price) > 0) {
                console.log("[Sidepanel] Bóc tách thành công qua DOM injection:", domData);
                const domProd = convertDomDataToRawProduct(domData, tabUrl);
                setProduct(domProd);
                setError(null);
                setLoading(false);
                return true;
              }
            } catch (injErr) {
              console.warn("[Sidepanel] DOM injection extraction warning:", injErr);
            }
            return false;
          };

          // Existing tabs do not automatically receive a newly reloaded
          // extension's content script. If the direct message has no
          // listener, inject the bundled script into the current tab and
          // retry once before falling back to the generic DOM/backend paths.
          const requestContentScriptExtraction = async (): Promise<any | null> => {
            if (!tab.id || !chrome.tabs) return null;

            const sendRequest = () => new Promise<any | null>((resolve) => {
              chrome.tabs.sendMessage(tab.id!, { action: "EXTRACT_CURRENT_PRODUCT" }, (res) => {
                if (chrome.runtime.lastError) resolve(null);
                else resolve(res || null);
              });
            });

            let response = await sendRequest();
            if (response?.success) return response;

            if (!chrome.scripting) return response;
            try {
              await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ["src/content/index.js"]
              });
              await new Promise(resolve => window.setTimeout(resolve, 150));
              response = await sendRequest();
            } catch (injectErr) {
              console.warn("[Sidepanel] Không thể nạp lại content script:", injectErr);
            }
            return response;
          };

          // Kiểm tra URL hệ thống trình duyệt
          if (tabUrl.startsWith("chrome://") || tabUrl.startsWith("edge://") || tabUrl.startsWith("about:") || tabUrl.startsWith("chrome-extension://")) {
            setProduct(null);
            setError("Vui lòng mở một trang web sản phẩm (Macorner, Taobao, 1688, Shopee...) để bắt đầu.");
            setLoading(false);
            return;
          }

          if (isMacornerProduct && await tryDomInjection()) return;

          // [Ưu tiên 1]: Gửi tin nhắn trực tiếp cho Content Script chuyên dụng trên Tab hiện tại
          // Content script chạy ngay trong trang web người dùng đang xem (có cookie, DOM đầy đủ, không bị anti-bot chặn)
          if (tab.id) {
            try {
              const response = await requestContentScriptExtraction();

              if (response?.success && response.data?.title && (response.data.images?.length > 0 || response.data.skuProps?.length > 0)) {
                console.log("[Sidepanel] Bóc tách thành công qua Content Script:", response.data);
                setProduct(response.data);
                setError(null);
                setLoading(false);
                return;
              }
            } catch (csErr) {
              console.warn("[Sidepanel] Content script direct message attempt:", csErr);
            }
          }

          // [Ưu tiên 2]: Trích xuất trực tiếp DOM trang web qua chrome.scripting.executeScript
          if (await tryDomInjection()) return;

          // [Ưu tiên 3]: Gọi Backend AI Cloner Preview (Dành cho dán link ngoài hoặc tab bị hạn chế)
          try {
            const prevRes = await apiFetch("/api/v1/clone/preview", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url: tabUrl })
            });
            const prevData = await prevRes.json();
            if (prevData?.success && prevData?.preview?.extractionStatus === "LIVE" && !prevData.preview.isDemo && prevData.preview.originalTitle) {
              console.log("[Sidepanel] Bóc tách thành công qua Backend Preview:", prevData.preview);
              setProduct(convertClonePreviewToRawProduct(prevData.preview, tabUrl));
              setError(null);
              setLoading(false);
              return;
            }
          } catch (beErr) {
            console.warn("[Sidepanel] Backend preview attempt failed:", beErr);
          }

          // [Kiểm tra đặc biệt]: Trang chủ / danh mục Macorner
          if (tabUrl.includes("macorner.co") && !tabUrl.includes("/products/")) {
            setProduct(null);
            setError("Bạn đang ở trang chủ hoặc danh mục Macorner. Vui lòng bấm vào một sản phẩm cụ thể để quét, hoặc dán link sản phẩm vào ô bên trên.");
            setLoading(false);
            return;
          }

          setProduct(null);
          setError("EXTRACTION_FAILED: Không lấy được dữ liệu thật. Hãy mở đúng trang chi tiết sản phẩm rồi thử lại.");
          setLoading(false);
          return;
        }
      } catch (e: any) {
        console.warn("[Sidepanel] Tab query error:", e);
      }
    }

    setProduct(null);
    setError("EXTRACTION_FAILED: Không có trang sản phẩm hợp lệ để trích xuất.");
    setLoading(false);
  };

  useEffect(() => {
    fetchProductData(true);

    // Tự động lắng nghe khi người dùng chuyển Tab hoặc chuyển URL trang
    if (typeof chrome !== "undefined" && chrome.tabs) {
      const handleActivated = () => {
        fetchProductData();
      };
      const handleUpdated = (_tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
        if (changeInfo.status === "complete" || changeInfo.url) {
          fetchProductData();
        }
      };

      chrome.tabs.onActivated?.addListener(handleActivated);
      chrome.tabs.onUpdated?.addListener(handleUpdated);

      return () => {
        chrome.tabs.onActivated?.removeListener(handleActivated);
        chrome.tabs.onUpdated?.removeListener(handleUpdated);
      };
    }
  }, []);

  return { product, loading, error, currentUrl, refresh: () => fetchProductData(true), extractByCustomUrl };
}

const getSourceInventoryState = (variant: any): { stock: number; available: boolean; inventoryTracked: boolean } => {
  const hasSourceQuantity = Number.isFinite(variant?.inventory_quantity);
  const hasNormalizedQuantity = Number.isFinite(variant?.stock) && typeof variant?.inventoryTracked !== "boolean" && typeof variant?.available !== "boolean";
  const inventoryTracked = typeof variant?.inventoryTracked === "boolean"
    ? variant.inventoryTracked
    : hasSourceQuantity || hasNormalizedQuantity;
  const stock = inventoryTracked
    ? Math.max(0, Math.trunc(Number(hasSourceQuantity ? variant.inventory_quantity : (variant.stock ?? 0))))
    : 0;
  const available = typeof variant?.available === "boolean"
    ? variant.available
    : inventoryTracked && stock > 0;
  return { stock, available, inventoryTracked };
};

function convertDomDataToRawProduct(domData: any, url: string): Raw1688Product {
  const currency = domData.currency || "USD";
  const originalPrice = Number(domData.price) || 0;
  const originalMin = domData.priceMin || originalPrice;
  const originalMax = domData.priceMax || originalPrice;
  const images = Array.isArray(domData.images) ? domData.images.filter(Boolean) : [];
  if (!domData.title?.trim() || images.length === 0 || originalMin <= 0) {
    throw new Error("EXTRACTION_FAILED: DOM thiếu tiêu đề, ảnh hoặc giá xác thực");
  }
  const parsedUrl = new URL(url);
  const pathId = parsedUrl.pathname.split("/").filter(Boolean).pop() || parsedUrl.hostname;
  const sourceProductId = String(domData.sourceProductId || pathId).slice(0, 128);
  const supplierName = domData.shopName || parsedUrl.hostname;
  const verifiedVariants = Array.isArray(domData.variants)
    ? domData.variants.filter((variant: any) => (variant.id || variant.sku) && (Number(variant.price) > 0 || originalPrice > 0))
    : [];

  // Nếu domData đã có mảng variants bóc tách được từ Shopify hoặc DOM
  if (verifiedVariants.length > 0) {
    const previewLike = {
      sourceProductId,
      originalTitle: domData.title,
      sourcePlatform: "GENERIC_WEB",
      supplierName,
      currency,
      originalPriceMin: originalMin,
      originalPriceMax: originalMax,
      primaryImage: images[0],
      galleryImages: images.slice(1),
      detailImages: domData.detailImages || [],
      rawOptions: domData.options,
      customOptionGroups: domData.customOptionGroups || [],
      customizationEvidence: domData.customizationEvidence,
      customizerMockupTemplateUrl: domData.customizerMockupTemplateUrl,
      extractionStatus: "LIVE",
      isDemo: false,
      rawAttributes: [
        { key: "Nguồn xuất xứ", value: supplierName },
        { key: "Phương thức scan", value: "Tự động trích xuất DOM thời gian thực" }
      ],
      variants: verifiedVariants.map((v: any) => {
        let vPrice = Number(v.price) > 0 ? Number(v.price) : originalPrice;
        if (vPrice >= 100 && currency === "USD") vPrice = Math.round((vPrice / 100) * 100) / 100;
        let img = v.imageUrl || v.featured_image?.src || (typeof v.featured_image === "string" ? v.featured_image : undefined);
        if (img && img.startsWith("//")) img = "https:" + img;

        const inventory = getSourceInventoryState(v);
        return {
          skuId: String(v.id || v.sku),
          name: v.title || [v.option1, v.option2, v.option3].filter(Boolean).join(" / ") || String(v.id || v.sku),
          option1: v.option1,
          option2: v.option2,
          option3: v.option3,
          originalPrice: vPrice,
          stock: inventory.stock,
          available: inventory.available,
          inventoryTracked: inventory.inventoryTracked,
          imageUrl: img
        };
      })
    };
    return convertClonePreviewToRawProduct(previewLike, url);
  }

  // Fallback nếu không có variants
  const minCNY = currency === "VND"
    ? Math.round((originalPrice / 3800) * 10) / 10
    : currency === "USD"
    ? Math.round(originalPrice * 7.2 * 10) / 10
    : originalPrice;

  return {
    offerId: sourceProductId,
    sourceUrl: url,
    title: domData.title,
    sourcePlatform: "GENERIC_WEB",
    originalCurrency: currency,
    originalPriceMin: originalPrice,
    originalPriceMax: originalPrice,
    shop: {
      shopId: `shop_${sourceProductId}`,
      shopName: supplierName,
      shopUrl: parsedUrl.origin
    },
    moq: 1,
    prices: {
      minPriceCNY: minCNY,
      maxPriceCNY: minCNY,
      currency: "CNY"
    },
    images,
    descriptionImages: domData.detailImages || [],
    customOptionGroups: domData.customOptionGroups || [],
    customizationEvidence: domData.customizationEvidence,
    customizerMockupTemplateUrl: domData.customizerMockupTemplateUrl,
    attributes: [
      { nameCN: "Nguồn xuất xứ", valueCN: supplierName },
      { nameCN: "Phương thức scan", valueCN: "Tự động trích xuất DOM thời gian thực" }
    ],
    skuProps: [
      {
        propId: "prop_variants",
        propNameCN: "Phân loại",
        values: [{ valueId: "val_default", valueCN: "Tiêu chuẩn (Default)" }]
      }
    ],
    skuMap: {
      val_default: {
        skuId: `sku_${sourceProductId}_default`,
        attributes: { "Phân loại": "Tiêu chuẩn (Default)" },
        priceCNY: minCNY,
        stock: 0
      }
    },
    extractedAt: new Date().toISOString()
  };
}

function convertClonePreviewToRawProduct(preview: any, url: string): Raw1688Product {
  if (preview?.isDemo || preview?.extractionStatus !== "LIVE") {
    throw new Error("EXTRACTION_UNVERIFIED: Chỉ dữ liệu LIVE mới được chuyển sang luồng nhập hàng");
  }
  const sourceProductId = String(preview.sourceProductId || "").trim();
  const title = String(preview.originalTitle || preview.translatedTitleVI || "").trim();
  const images = [
    preview.primaryImage,
    ...(preview.galleryImages?.length ? preview.galleryImages : (preview.detailImages || []).slice(0, 8))
  ].filter(Boolean);
  if (!sourceProductId || title.length < 3 || images.length === 0 || Number(preview.originalPriceMin) <= 0) {
    throw new Error("EXTRACTION_FAILED: Preview thiếu ID, tiêu đề, ảnh hoặc giá xác thực");
  }

  const toCny = (p: number) => {
    if (typeof p !== "number" || !Number.isFinite(p) || p <= 0) return 0;
    return preview.currency === "VND"
      ? Math.round((p / 3800) * 10) / 10
      : preview.currency === "USD"
      ? Math.round(p * 7.2 * 10) / 10
      : p;
  };

  const minCNY = toCny(preview.originalPriceMin);
  const maxCNY = toCny(preview.originalPriceMax);

  const rawVariants: any[] = preview.variants || [];
  let skuProps: any[] = [];
  const skuMap: Record<string, any> = {};

  const rawOptions = preview.rawOptions || [];

  if (rawOptions.length >= 2) {
    // 2 trục thuộc tính (ví dụ: Size x Buy More Save More)
    const opt1 = rawOptions[0];
    const opt2 = rawOptions[1];

    skuProps = [
      {
        propId: "prop_1",
        propNameCN: opt1.name || "Kích thước",
        values: opt1.values.map((val: string, idx: number) => ({
          valueId: `v1_${idx}`,
          valueCN: val
        }))
      },
      {
        propId: "prop_2",
        propNameCN: opt2.name || "Quy cách",
        values: opt2.values.map((val: string, idx: number) => ({
          valueId: `v2_${idx}`,
          valueCN: val
        }))
      }
    ];

    rawVariants.forEach((v: any) => {
      const vPriceCNY = toCny(v.originalPrice);
      const skuItem = {
        skuId: v.skuId,
        attributes: {
          [opt1.name || "Kích thước"]: v.option1 || "",
          [opt2.name || "Quy cách"]: v.option2 || ""
        },
        priceCNY: vPriceCNY > 0 ? vPriceCNY : minCNY,
        stock: v.stock ?? 0,
        available: typeof v.available === "boolean" ? v.available : undefined,
        inventoryTracked: typeof v.inventoryTracked === "boolean" ? v.inventoryTracked : undefined,
        imageUrl: v.imageUrl
      };

      skuMap[v.skuId] = skuItem;
      if (v.option1 && v.option2) {
        skuMap[`${v.option1}&${v.option2}`] = skuItem;
        skuMap[`${v.option1}>${v.option2}`] = skuItem;
        skuMap[`${v.option1};${v.option2}`] = skuItem;
        skuMap[`${v.option1} ${v.option2}`] = skuItem;
        skuMap[`${v.option1}_${v.option2}`] = skuItem;
        skuMap[`${v.option1} / ${v.option2}`] = skuItem;
      }
      if (v.name) skuMap[v.name] = skuItem;
      if (v.nameVI) skuMap[v.nameVI] = skuItem;
    });
  } else if (rawOptions.length === 1) {
    // 1 trục thuộc tính (Bộ sản phẩm, Combo, Quy cách đơn)
    const opt = rawOptions[0];
    skuProps = [
      {
        propId: "prop_1",
        propNameCN: opt.name || "Phân loại",
        values: opt.values.map((val: string, idx: number) => ({
          valueId: `v_${idx}`,
          valueCN: val
        }))
      }
    ];

    rawVariants.forEach((v: any) => {
      const vPriceCNY = toCny(v.originalPrice);
      const skuItem = {
        skuId: v.skuId,
        attributes: {
          [opt.name || "Phân loại"]: v.option1 || v.nameVI || v.name
        },
        priceCNY: vPriceCNY > 0 ? vPriceCNY : minCNY,
        stock: v.stock ?? 0,
        available: typeof v.available === "boolean" ? v.available : undefined,
        inventoryTracked: typeof v.inventoryTracked === "boolean" ? v.inventoryTracked : undefined,
        imageUrl: v.imageUrl
      };

      skuMap[v.skuId] = skuItem;
      if (v.option1) skuMap[v.option1] = skuItem;
      if (v.name) skuMap[v.name] = skuItem;
      if (v.nameVI) skuMap[v.nameVI] = skuItem;
    });
  } else {
    // Không có rawOptions, kiểm tra xem variants có option1 và option2 không
    const opt1Vals = [...new Set(rawVariants.map(v => v.option1).filter(Boolean))] as string[];
    const opt2Vals = [...new Set(rawVariants.map(v => v.option2).filter(Boolean))] as string[];

    if (opt1Vals.length > 0 && opt2Vals.length > 0) {
      skuProps = [
        {
          propId: "prop_1",
          propNameCN: "Kích thước",
          values: opt1Vals.map((val, idx) => ({ valueId: `v1_${idx}`, valueCN: val }))
        },
        {
          propId: "prop_2",
          propNameCN: "Quy cách",
          values: opt2Vals.map((val, idx) => ({ valueId: `v2_${idx}`, valueCN: val }))
        }
      ];

      rawVariants.forEach((v: any) => {
        const vPriceCNY = toCny(v.originalPrice);
        const skuItem = {
          skuId: v.skuId,
          attributes: {
            "Kích thước": v.option1 || "",
            "Quy cách": v.option2 || ""
          },
          priceCNY: vPriceCNY > 0 ? vPriceCNY : minCNY,
          stock: v.stock ?? 0,
          available: typeof v.available === "boolean" ? v.available : undefined,
          inventoryTracked: typeof v.inventoryTracked === "boolean" ? v.inventoryTracked : undefined,
          imageUrl: v.imageUrl
        };

        skuMap[v.skuId] = skuItem;
        if (v.option1 && v.option2) {
          skuMap[`${v.option1}&${v.option2}`] = skuItem;
          skuMap[`${v.option1}>${v.option2}`] = skuItem;
          skuMap[`${v.option1};${v.option2}`] = skuItem;
          skuMap[`${v.option1} ${v.option2}`] = skuItem;
          skuMap[`${v.option1}_${v.option2}`] = skuItem;
          skuMap[`${v.option1} / ${v.option2}`] = skuItem;
        }
        if (v.name) skuMap[v.name] = skuItem;
      });
    } else {
      skuProps = [
        {
          propId: "prop_variants",
          propNameCN: "Phân loại",
          values: rawVariants.map((v: any) => ({
            valueId: v.skuId,
            valueCN: v.nameVI || v.name,
            imageUrl: v.imageUrl
          }))
        }
      ];

      rawVariants.forEach((v: any) => {
        const vPriceCNY = toCny(v.originalPrice);
        const skuItem = {
          skuId: v.skuId,
          attributes: { "Phân loại": v.nameVI || v.name },
          priceCNY: vPriceCNY > 0 ? vPriceCNY : minCNY,
          stock: v.stock ?? 0,
          available: typeof v.available === "boolean" ? v.available : undefined,
          inventoryTracked: typeof v.inventoryTracked === "boolean" ? v.inventoryTracked : undefined,
          imageUrl: v.imageUrl
        };

        skuMap[v.skuId] = skuItem;
        if (v.name) skuMap[v.name] = skuItem;
        if (v.nameVI) skuMap[v.nameVI] = skuItem;
      });
    }
  }

  if (Object.keys(skuMap).length === 0) {
    const defaultSkuId = `sku_${sourceProductId}_default`;
    skuProps = [{
      propId: "prop_variants",
      propNameCN: "Phân loại",
      values: [{ valueId: defaultSkuId, valueCN: "Tiêu chuẩn" }]
    }];
    skuMap[defaultSkuId] = {
      skuId: defaultSkuId,
      attributes: { "Phân loại": "Tiêu chuẩn" },
      priceCNY: minCNY,
      stock: 0,
      imageUrl: images[0]
    };
  }

  return {
    offerId: sourceProductId,
    sourceUrl: url,
    title,
    sourcePlatform: preview.sourcePlatform,
    originalCurrency: preview.currency,
    originalPriceMin: preview.originalPriceMin,
    originalPriceMax: preview.originalPriceMax,
    shop: {
      shopId: `shop_${sourceProductId}`,
      shopName: preview.supplierName || new URL(url).hostname,
      shopUrl: new URL(url).origin
    },
    moq: 1,
    prices: {
      minPriceCNY: minCNY,
      maxPriceCNY: maxCNY || minCNY,
      currency: "CNY"
    },
    images,
    descriptionImages: preview.detailImages || [],
    customOptionGroups: preview.customOptionGroups || [],
    customizationEvidence: preview.customizationEvidence,
    customizerMockupTemplateUrl: preview.customizerMockupTemplateUrl,
    attributes: (preview.rawAttributes || preview.attributes || []).map((a: any) => ({ nameCN: a.key, valueCN: a.value })),
    skuProps,
    skuMap,
    extractedAt: new Date().toISOString()
  };
}
