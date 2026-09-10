import { WebProduct, WooCommerceConfig, ShopifyConfig } from "@hub1688/shared-types";

/**
 * Sinh cấu trúc payload chuẩn WooCommerce REST API v3
 */
export function buildWooCommercePayload(product: WebProduct, config?: Partial<WooCommerceConfig>): Record<string, any> {
  const isVariable = (product.variants?.length || 0) > 1;

  const images = [
    { src: product.primaryImage, alt: product.titleVI },
    ...(product.galleryImages || []).map((img, i) => ({
      src: img,
      alt: `${product.titleVI} - Ảnh #${i + 1}`
    }))
  ];

  // Thu thập các giá trị thuộc tính duy nhất
  const colors = Array.from(new Set(product.variants.map(v => v.colorName).filter(Boolean)));
  const sizes = Array.from(new Set(product.variants.map(v => v.sizeName).filter(Boolean)));

  const attributes: any[] = [];
  if (colors.length > 0) {
    attributes.push({
      name: "Màu sắc",
      visible: true,
      variation: isVariable,
      options: colors
    });
  }
  if (sizes.length > 0) {
    attributes.push({
      name: "Kích thước",
      visible: true,
      variation: isVariable,
      options: sizes
    });
  }

  return {
    name: product.titleVI,
    type: isVariable ? "variable" : "simple",
    regular_price: product.minPriceVND.toString(),
    description: product.fullDescVI || "",
    short_description: product.shortDescVI || "",
    sku: product.skuCode,
    manage_stock: true,
    stock_quantity: product.variants.reduce((sum, v) => sum + v.stockQuantity, 0),
    categories: [{ name: product.categoryName || "Thời trang" }],
    images,
    attributes
  };
}

/**
 * Sinh cấu trúc payload chuẩn Shopify Admin REST API
 */
export function buildShopifyPayload(product: WebProduct, config?: Partial<ShopifyConfig>): Record<string, any> {
  const images = [
    { src: product.primaryImage, alt: product.titleEN || product.titleVI },
    ...(product.galleryImages || []).map((img, i) => ({
      src: img,
      alt: `${product.titleEN || product.titleVI} - Detail #${i + 1}`
    }))
  ];

  const variants = product.variants.map(v => {
    // Giá USD ước tính
    const priceUSD = (v.sellingPriceVND / 24500).toFixed(2);
    return {
      option1: v.colorNameEN || v.colorName || "Default",
      option2: v.sizeNameEN || v.sizeName || "Freesize",
      price: priceUSD,
      sku: v.sourceSkuId,
      inventory_management: "shopify",
      inventory_quantity: v.stockQuantity
    };
  });

  return {
    product: {
      title: product.titleEN || product.titleVI,
      body_html: product.fullDescEN || product.fullDescVI || "",
      vendor: product.supplierName || "1688 Hub Store",
      product_type: product.categoryName || "Fashion",
      tags: (product.focusKeywords || []).join(", "),
      images,
      options: [
        { name: "Color" },
        { name: "Size" }
      ],
      variants
    }
  };
}

/**
 * Xuất dữ liệu sản phẩm thành file CSV tương thích với Shopee & TikTok Shop Seller Center
 */
export function buildMarketplaceCSV(
  products: WebProduct[],
  platform: "SHOPEE" | "TIKTOK_SHOP" = "SHOPEE"
): string {
  if (platform === "SHOPEE") {
    // Cột chuẩn Shopee Mass Upload Template
    const headers = [
      "Mã Ngành Hàng",
      "Tên Sản Phẩm",
      "Mô Tả Sản Phẩm",
      "Mã SKU",
      "Tên Nhóm Phân Loại 1",
      "Tên Phân Loại 1 (Màu sắc)",
      "Tên Nhóm Phân Loại 2",
      "Tên Phân Loại 2 (Size)",
      "Giá Bán VNĐ",
      "Kho Hàng",
      "Cân Nặng (gram)",
      "Hình Ảnh Bìa",
      "Hình Ảnh 1",
      "Hình Ảnh 2"
    ];

    const rows: string[] = [headers.map(h => `"${h}"`).join(",")];

    for (const p of products) {
      for (const v of p.variants) {
        if (!v.selectedForSale) continue;
        const row = [
          "10001", // Default Fashion Category
          p.titleVI.replace(/"/g, '""'),
          (p.shortDescVI || p.titleVI).replace(/"/g, '""'),
          v.sourceSkuId,
          "Màu Sắc",
          v.colorName || "Mặc định",
          "Kích Thước",
          v.sizeName || "Freesize",
          v.sellingPriceVND.toString(),
          v.stockQuantity.toString(),
          "250", // 250g
          p.primaryImage || "",
          p.galleryImages[0] || "",
          p.galleryImages[1] || ""
        ];
        rows.push(row.map(cell => `"${cell}"`).join(","));
      }
    }
    return rows.join("\n");
  } else {
    // Cột chuẩn TikTok Shop Product Bulk Upload Template
    const headers = [
      "Product Name",
      "Category",
      "Brand",
      "Description",
      "Package Weight (kg)",
      "Color Option",
      "Size Option",
      "SKU",
      "Price VND",
      "Quantity",
      "Main Image URL"
    ];

    const rows: string[] = [headers.map(h => `"${h}"`).join(",")];

    for (const p of products) {
      for (const v of p.variants) {
        if (!v.selectedForSale) continue;
        const row = [
          p.titleVI.replace(/"/g, '""'),
          p.categoryName || "Apparel",
          "OEM",
          (p.shortDescVI || p.titleVI).replace(/"/g, '""'),
          "0.25",
          v.colorName || "Default",
          v.sizeName || "Free",
          v.sourceSkuId,
          v.sellingPriceVND.toString(),
          v.stockQuantity.toString(),
          p.primaryImage || ""
        ];
        rows.push(row.map(cell => `"${cell}"`).join(","));
      }
    }
    return rows.join("\n");
  }
}
