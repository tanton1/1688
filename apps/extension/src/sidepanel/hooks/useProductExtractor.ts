import { useState, useEffect } from "react";
import { Raw1688Product } from "@hub1688/shared-types";
import { getApiBaseUrl } from "../../shared/config.js";

export function useProductExtractor() {
  const [product, setProduct] = useState<Raw1688Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string>("");

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
      const baseUrl = await getApiBaseUrl();
      const prevRes = await fetch(`${baseUrl}/api/v1/clone/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: cleanUrl })
      });
      const prevData = await prevRes.json();
      if (prevData?.success && prevData?.preview) {
        setProduct(convertClonePreviewToRawProduct(prevData.preview, cleanUrl));
        setError(null);
      } else {
        setError(prevData?.error || "Không thể bóc tách sản phẩm từ URL này. Vui lòng kiểm tra lại link.");
      }
    } catch (e: any) {
      setError(`Lỗi kết nối máy chủ: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchProductData = async () => {
    setLoading(true);
    setError(null);

    // 1. Môi trường Chrome Extension
    if (typeof chrome !== "undefined" && chrome.tabs) {
      try {
        // Tìm tab đang active (ưu tiên lastFocusedWindow, fallback currentWindow)
        let [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        if (!tab || !tab.id) {
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          tab = tabs[0];
        }

        if (tab?.id) {
          const tabUrl = tab.url || "";
          setCurrentUrl(tabUrl);

          // Kiểm tra nếu là trang hệ thống Chrome
          if (tabUrl.startsWith("chrome://") || tabUrl.startsWith("edge://") || tabUrl.startsWith("about:")) {
            setProduct(null);
            setError("Vui lòng mở một trang web thương mại điện tử (1688, Taobao, Shopee, Macorner...) để bắt đầu.");
            setLoading(false);
            return;
          }

          // A. Gửi message cho Content Script trong tab
          const sendExtractMessage = (tabId: number): Promise<any> => {
            return new Promise((resolve) => {
              chrome.tabs.sendMessage(tabId, { action: "EXTRACT_CURRENT_PRODUCT" }, (response) => {
                if (chrome.runtime.lastError) {
                  resolve(null);
                } else {
                  resolve(response);
                }
              });
            });
          };

          let response = await sendExtractMessage(tab.id);

          // B. Nếu tab chưa có content script (do tab mở trước khi cài extension), tự động inject ngay lập tức
          if (!response && chrome.scripting) {
            try {
              await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ["src/content/index.js"]
              });
              await new Promise(r => setTimeout(r, 120));
              response = await sendExtractMessage(tab.id);
            } catch (injErr) {
              console.warn("[Sidepanel] Script on-the-fly injection warning:", injErr);
            }
          }

          if (response?.success && response.data) {
            // Kiểm tra xem dữ liệu bóc tách được có phải sản phẩm thật không
            if (response.data.title && response.data.title.length > 3) {
              setProduct(response.data);
              setError(null);
              setLoading(false);
              return;
            }
          }

          // C. Nếu Content Script chưa lấy được hoặc là trang ngoài, gọi Backend Clone Preview với URL của tab
          if (tabUrl.startsWith("http://") || tabUrl.startsWith("https://")) {
            try {
              const baseUrl = await getApiBaseUrl();
              const prevRes = await fetch(`${baseUrl}/api/v1/clone/preview`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: tabUrl })
              });
              const prevData = await prevRes.json();
              if (prevData?.success && prevData?.preview) {
                setProduct(convertClonePreviewToRawProduct(prevData.preview, tabUrl));
                setError(null);
                setLoading(false);
                return;
              }
            } catch (beErr) {
              console.warn("[Sidepanel] Backend preview fallback warning:", beErr);
            }
          }

          // D. Nếu là trang chủ hoặc danh mục (không có sản phẩm cụ thể)
          if (tabUrl.includes("macorner.co") && !tabUrl.includes("/products/")) {
            setProduct(null);
            setError("Bạn đang ở trang chủ/danh mục Macorner. Vui lòng bấm vào một sản phẩm cụ thể để quét, hoặc dán link sản phẩm vào ô bên trên.");
            setLoading(false);
            return;
          }

          // E. Fallback 1688 mock nếu đang trên 1688
          if (tabUrl.includes("1688.com")) {
            setProduct(getMock1688Product());
            setLoading(false);
            return;
          }

          setProduct(null);
          setError("Chưa nhận diện được sản phẩm trên trang này. Vui lòng mở trang chi tiết sản phẩm hoặc dán link sản phẩm vào ô bên trên.");
          setLoading(false);
          return;
        }
      } catch (e: any) {
        console.warn("[Sidepanel] Tab query error:", e);
      }
    }

    // 2. Fallback dữ liệu mẫu để preview test UI
    setTimeout(() => {
      setProduct(getMock1688Product());
      setLoading(false);
    }, 400);
  };

  useEffect(() => {
    fetchProductData();
  }, []);

  return { product, loading, error, currentUrl, refresh: fetchProductData, extractByCustomUrl };
}

function convertClonePreviewToRawProduct(preview: any, url: string): Raw1688Product {
  const minCNY = preview.currency === "VND"
    ? Math.round((preview.originalPriceMin / 3800) * 10) / 10
    : preview.currency === "USD"
    ? Math.round(preview.originalPriceMin * 7.2 * 10) / 10
    : preview.originalPriceMin;

  const maxCNY = preview.currency === "VND"
    ? Math.round((preview.originalPriceMax / 3800) * 10) / 10
    : preview.currency === "USD"
    ? Math.round(preview.originalPriceMax * 7.2 * 10) / 10
    : preview.originalPriceMax;

  return {
    offerId: preview.sourceProductId || `hub_${Date.now()}`,
    sourceUrl: url,
    title: preview.originalTitle || preview.translatedTitleVI,
    sourcePlatform: preview.sourcePlatform,
    originalCurrency: preview.currency,
    originalPriceMin: preview.originalPriceMin,
    originalPriceMax: preview.originalPriceMax,
    shop: {
      shopId: `shop_${preview.sourceProductId || "clone"}`,
      shopName: preview.supplierName || `${preview.sourcePlatform} Shop`,
      shopUrl: url,
      ratingScore: 4.9
    },
    moq: 1,
    prices: {
      minPriceCNY: minCNY || 30,
      maxPriceCNY: maxCNY || 45,
      currency: "CNY"
    },
    images: [
      preview.primaryImage,
      ...(preview.galleryImages?.length ? preview.galleryImages : (preview.detailImages || []).slice(0, 8))
    ].filter(Boolean),
    descriptionImages: preview.detailImages || [],
    attributes: (preview.rawAttributes || preview.attributes || []).map((a: any) => ({ nameCN: a.key, valueCN: a.value })),
    skuProps: [
      {
        propId: "prop_variants",
        propNameCN: "Phân loại",
        values: (preview.variants || []).map((v: any) => ({
          valueId: v.skuId,
          valueCN: v.nameVI || v.name,
          imageUrl: v.imageUrl
        }))
      }
    ],
    skuMap: (preview.variants || []).reduce((acc: any, v: any) => {
      acc[v.skuId] = {
        skuId: v.skuId,
        attributes: { "Phân loại": v.nameVI || v.name },
        priceCNY: minCNY || 30,
        stock: v.stock || 100,
        imageUrl: v.imageUrl
      };
      return acc;
    }, {}),
    extractedAt: new Date().toISOString()
  };
}

function getMock1688Product(): Raw1688Product {
  return {
    offerId: "83647282933",
    sourceUrl: "https://detail.1688.com/offer/83647282933.html",
    title: "2026新款跨境爆款女士高腰弹力速干无缝瑜伽健身裤厂家直销一件代发",
    shop: {
      shopId: "shop_83647282933",
      shopName: "义乌市尚品服饰源头实力工厂",
      shopUrl: "https://shop123.1688.com",
      ratingScore: 4.9
    },
    moq: 2,
    prices: {
      minPriceCNY: 32.0,
      maxPriceCNY: 45.0,
      currency: "CNY"
    },
    images: [
      "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&auto=format&fit=crop&q=80"
    ],
    attributes: [
      { nameCN: "材质/面料", valueCN: "锦纶/氨纶 (Nylon/Spandex)" },
      { nameCN: "适用场景", valueCN: "瑜伽 / 跑步 / 健身训练" },
      { nameCN: "版型", valueCN: "高腰紧身提臀" }
    ],
    skuProps: [
      {
        propId: "prop_color",
        propNameCN: "颜色",
        values: [
          { valueId: "col_black", valueCN: "黑色" },
          { valueId: "col_pink", valueCN: "粉色" },
          { valueId: "col_white", valueCN: "白色" }
        ]
      },
      {
        propId: "prop_size",
        propNameCN: "尺码",
        values: [
          { valueId: "size_s", valueCN: "S" },
          { valueId: "size_m", valueCN: "M" },
          { valueId: "size_l", valueCN: "L" },
          { valueId: "size_xl", valueCN: "XL" }
        ]
      }
    ],
    skuMap: {
      "col_black_size_s": {
        skuId: "1688_4388991",
        attributes: { "颜色": "黑色", "尺码": "S" },
        priceCNY: 32.0,
        stock: 120
      },
      "col_black_size_m": {
        skuId: "1688_4388992",
        attributes: { "颜色": "黑色", "尺码": "M" },
        priceCNY: 32.0,
        stock: 243
      },
      "col_pink_size_m": {
        skuId: "1688_4388993",
        attributes: { "颜色": "粉色", "尺码": "M" },
        priceCNY: 34.0,
        stock: 92
      },
      "col_pink_size_l": {
        skuId: "1688_4388994",
        attributes: { "颜色": "粉色", "尺码": "L" },
        priceCNY: 34.0,
        stock: 76
      }
    },
    extractedAt: new Date().toISOString()
  };
}
