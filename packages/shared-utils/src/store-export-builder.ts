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
          (v.sellingPriceVND || p.minPriceVND || 0).toString(),
          (v.stockQuantity ?? 100).toString(),
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
          (v.sellingPriceVND || p.minPriceVND || 0).toString(),
          (v.stockQuantity ?? 100).toString(),
          p.primaryImage || ""
        ];
        rows.push(row.map(cell => `"${cell}"`).join(","));
      }
    }
    return rows.join("\n");
  }
}

/**
 * Xuất file CSV chuẩn 100% của Shopify (Shopify Product Import Standard CSV)
 */
export function buildShopifyCSV(products: WebProduct[]): string {
  const headers = [
    "Handle",
    "Title",
    "Body (HTML)",
    "Vendor",
    "Product Category",
    "Type",
    "Tags",
    "Published",
    "Option1 Name",
    "Option1 Value",
    "Option2 Name",
    "Option2 Value",
    "Variant SKU",
    "Variant Grams",
    "Variant Inventory Tracker",
    "Variant Inventory Qty",
    "Variant Inventory Policy",
    "Variant Fulfillment Service",
    "Variant Price",
    "Variant Compare At Price",
    "Variant Requires Shipping",
    "Variant Taxable",
    "Image Src",
    "Image Position",
    "Image Alt Text",
    "Status"
  ];

  const rows: string[] = [headers.map(h => `"${h}"`).join(",")];

  for (const p of products) {
    const handle = (p.slug || p.skuCode || `prod-${Date.now()}`).toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
    const activeVariants = (p.variants || []).filter(v => v.selectedForSale);
    const variantsToExport = activeVariants.length > 0 ? activeVariants : [
      {
        sourceSkuId: p.skuCode || `SKU-${Date.now()}`,
        colorName: "Default",
        sizeName: "Standard",
        sellingPriceVND: p.minPriceVND,
        stockQuantity: 100,
        selectedForSale: true
      } as any
    ];

    const allImages = [p.primaryImage, ...(p.galleryImages || [])].filter(Boolean);

    variantsToExport.forEach((v, index) => {
      const isFirst = index === 0;
      const priceUSD = ((v.sellingPriceVND || p.minPriceVND) / 25400).toFixed(2);
      const comparePriceUSD = (parseFloat(priceUSD) * 1.3).toFixed(2);
      const imageSrc = allImages[index] || (isFirst ? allImages[0] : "");

      const row = [
        handle,
        isFirst ? (p.titleEN || p.titleVI || "").replace(/"/g, '""') : "",
        isFirst ? (p.fullDescEN || p.fullDescVI || p.shortDescVI || "").replace(/"/g, '""') : "",
        p.supplierName || "1688 Listing Sync Hub",
        p.categoryName || "Apparel & Accessories",
        p.categoryName || "General",
        (p.focusKeywords || []).join(", "),
        "TRUE",
        "Color",
        v.colorNameEN || v.colorName || "Default",
        "Size",
        v.sizeNameEN || v.sizeName || "Standard",
        v.sourceSkuId,
        "250",
        "shopify",
        (v.stockQuantity || 100).toString(),
        "deny",
        "manual",
        priceUSD,
        comparePriceUSD,
        "TRUE",
        "FALSE",
        imageSrc || "",
        (index + 1).toString(),
        isFirst ? (p.titleEN || p.titleVI || "").replace(/"/g, '""') : "",
        "active"
      ];

      rows.push(row.map(cell => `"${cell}"`).join(","));
    });
  }

  return rows.join("\n");
}

/**
 * Xuất file CSV chuẩn WooCommerce Product Import CSV
 */
export function buildWooCommerceCSV(products: WebProduct[]): string {
  const headers = [
    "ID",
    "Type",
    "SKU",
    "Name",
    "Published",
    "Is featured?",
    "Visibility in catalog",
    "Short description",
    "Description",
    "Tax status",
    "In stock?",
    "Stock",
    "Regular price",
    "Categories",
    "Images",
    "Attribute 1 name",
    "Attribute 1 value(s)",
    "Attribute 1 visible",
    "Attribute 1 global"
  ];

  const rows: string[] = [headers.map(h => `"${h}"`).join(",")];

  for (const p of products) {
    const imagesStr = [p.primaryImage, ...(p.galleryImages || [])].filter(Boolean).join(", ");
    const colorValues = Array.from(new Set(p.variants.map(v => v.colorName).filter(Boolean))).join(", ");

    const row = [
      "",
      p.variants.length > 1 ? "variable" : "simple",
      p.skuCode || `SKU-${Date.now()}`,
      (p.titleVI || p.titleEN || "").replace(/"/g, '""'),
      "1",
      "0",
      "visible",
      (p.shortDescVI || "").replace(/"/g, '""'),
      (p.fullDescVI || p.fullDescEN || "").replace(/"/g, '""'),
      "taxable",
      "1",
      p.variants.reduce((acc, v) => acc + (v.stockQuantity || 0), 0).toString(),
      p.minPriceVND.toString(),
      (p.categoryName || "Sản phẩm mới").replace(/"/g, '""'),
      imagesStr,
      "Phân loại",
      colorValues || "Mặc định",
      "1",
      "1"
    ];

    rows.push(row.map(cell => `"${cell}"`).join(","));
  }

  return rows.join("\n");
}

/**
 * Xuất file CSV chuẩn Haravan Import Tiếng Việt
 */
export function buildHaravanCSV(products: WebProduct[]): string {
  const headers = [
    "Đường dẫn / Handle",
    "Tên",
    "Mô tả",
    "Nhà cung cấp",
    "Loại sản phẩm",
    "Tags",
    "Hiển thị",
    "Tên thuộc tính 1",
    "Giá trị thuộc tính 1",
    "Tên thuộc tính 2",
    "Giá trị thuộc tính 2",
    "Mã SKU",
    "Khối lượng",
    "Quản lý kho",
    "Số lượng",
    "Giá",
    "Giá so sánh",
    "Hình ảnh"
  ];

  const rows: string[] = [headers.map(h => `"${h}"`).join(",")];

  for (const p of products) {
    const handle = (p.slug || p.skuCode || `sp-${Date.now()}`).toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const activeVariants = (p.variants || []).filter(v => v.selectedForSale);
    const variantsToExport = activeVariants.length > 0 ? activeVariants : [
      {
        sourceSkuId: p.skuCode || `SKU-${Date.now()}`,
        colorName: "Tiêu chuẩn",
        sizeName: "Freesize",
        sellingPriceVND: p.minPriceVND,
        stockQuantity: 100,
        selectedForSale: true
      } as any
    ];

    variantsToExport.forEach((v, idx) => {
      const isFirst = idx === 0;
      const comparePrice = Math.round((v.sellingPriceVND || p.minPriceVND) * 1.25);
      const imageSrc = (p.galleryImages && p.galleryImages[idx]) || p.primaryImage || "";

      const row = [
        handle,
        isFirst ? (p.titleVI || "").replace(/"/g, '""') : "",
        isFirst ? (p.fullDescVI || p.shortDescVI || "").replace(/"/g, '""') : "",
        p.supplierName || "1688 Sync Hub",
        p.categoryName || "Thời trang & Đời sống",
        (p.focusKeywords || []).join(", "),
        "true",
        "Màu sắc",
        v.colorName || "Mặc định",
        "Kích thước",
        v.sizeName || "Tiêu chuẩn",
        v.sourceSkuId,
        "250",
        "haravan",
        (v.stockQuantity || 100).toString(),
        (v.sellingPriceVND || p.minPriceVND).toString(),
        comparePrice.toString(),
        imageSrc
      ];

      rows.push(row.map(cell => `"${cell}"`).join(","));
    });
  }

  return rows.join("\n");
}

/**
 * Chuyển đổi linh hoạt Raw Product từ Extension thành WebProduct chuẩn để xuất file tức thời
 */
export function convertRawProductToExportable(
  raw: any,
  variants: any[],
  categoryName: string = "Sản phẩm chọn lọc"
): WebProduct {
  const activeVariants = (variants || []).filter(v => v.selectedForSale);
  const minPrice = activeVariants.length > 0
    ? Math.min(...activeVariants.map(v => v.sellingPriceVND || 250000))
    : 250000;
  const maxPrice = activeVariants.length > 0
    ? Math.max(...activeVariants.map(v => v.sellingPriceVND || 250000))
    : minPrice;

  return {
    id: `prod_${raw.offerId || Date.now()}`,
    sourcePlatform: raw.sourcePlatform || "1688",
    sourceProductId: raw.offerId || `src_${Date.now()}`,
    sourceUrl: raw.sourceUrl || "",
    supplierName: raw.shop?.shopName || "OEM Supplier",
    categoryName,
    skuCode: `HUB-${raw.offerId || Date.now()}`,
    titleVI: raw.title || "Sản phẩm chất lượng cao",
    titleEN: raw.title || "High Quality Product",
    slug: (raw.title || "product").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60),
    shortDescVI: `Sản phẩm ${raw.title} chất lượng cao, bền đẹp, tiện dụng. Phù hợp cho nhu cầu hàng ngày và làm quà tặng ý nghĩa.`,
    fullDescVI: `<h3>Mô tả chi tiết sản phẩm: ${raw.title}</h3><p>Sản phẩm chính hãng với thiết kế tinh xảo, chất liệu an toàn, độ bền cao.</p>`,
    minPriceVND: minPrice,
    maxPriceVND: maxPrice,
    primaryImage: raw.images?.[0] || "",
    galleryImages: (raw.images || []).slice(1),
    variants: activeVariants.length > 0 ? activeVariants : [
      {
        sourceSkuId: `SKU_${raw.offerId || "default"}`,
        colorName: "Tiêu chuẩn",
        sizeName: "Mặc định",
        costPriceVND: 120000,
        sellingPriceVND: minPrice,
        stockQuantity: 200,
        sourceAvailable: true,
        selectedForSale: true
      }
    ],
    qualityScore: 90,
    status: "READY_TO_REVIEW",
    isTitleLocked: false,
    isDescLocked: false,
    isImagesLocked: false,
    isPriceAutoSync: true,
    isStockAutoSync: true,
    focusKeywords: ["Sản phẩm hot trend", "Hàng xuất khẩu", "Bán chạy 2026"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/**
 * Tạo URL mã QR thanh toán ngân hàng VietQR tự động chuẩn Napas 247
 * (https://img.vietqr.io/image/{bankId}-{accountNo}-compact2.png)
 */
export function generateVietQRUrl(params: {
  bankId?: string;
  bankCode?: string;
  accountNo: string;
  amount?: number;
  amountVND?: number;
  orderInfo?: string;
  description?: string;
  accountName?: string;
}): string {
  const bank = encodeURIComponent(params.bankId || params.bankCode || "MB");
  const account = encodeURIComponent(params.accountNo || "");
  const amountVal = params.amount ?? params.amountVND;
  const desc = encodeURIComponent(params.orderInfo || params.description || "Thanh toan don hang");
  const accountName = params.accountName ? encodeURIComponent(params.accountName) : "";

  let url = `https://img.vietqr.io/image/${bank}-${account}-compact2.png`;
  const queryParts: string[] = [];
  if (amountVal !== undefined && amountVal > 0) {
    queryParts.push(`amount=${Math.round(amountVal)}`);
  }
  if (desc) {
    queryParts.push(`addInfo=${desc}`);
  }
  if (accountName) {
    queryParts.push(`accountName=${accountName}`);
  }
  if (queryParts.length > 0) {
    url += `?${queryParts.join("&")}`;
  }
  return url;
}


