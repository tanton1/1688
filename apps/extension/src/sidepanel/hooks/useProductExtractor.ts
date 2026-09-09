import { useState, useEffect } from "react";
import { Raw1688Product } from "@hub1688/shared-types";

export function useProductExtractor() {
  const [product, setProduct] = useState<Raw1688Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProductData = async () => {
    setLoading(true);
    setError(null);

    // 1. Nếu đang chạy trong môi trường Chrome Extension
    if (typeof chrome !== "undefined" && chrome.tabs) {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
          chrome.tabs.sendMessage(tab.id, { action: "EXTRACT_CURRENT_PRODUCT" }, (response) => {
            if (chrome.runtime.lastError) {
              console.warn("[Sidepanel] Fallback data due to runtime error:", chrome.runtime.lastError.message);
              setProduct(getMock1688Product());
            } else if (response?.success && response.data) {
              setProduct(response.data);
            } else {
              setProduct(getMock1688Product());
            }
            setLoading(false);
          });
          return;
        }
      } catch (e: any) {
        console.warn("[Sidepanel] Tab query error:", e);
      }
    }

    // 2. Fallback dữ liệu mẫu để preview test UI mượt mà
    setTimeout(() => {
      setProduct(getMock1688Product());
      setLoading(false);
    }, 400);
  };

  useEffect(() => {
    fetchProductData();
  }, []);

  return { product, loading, error, refresh: fetchProductData };
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
