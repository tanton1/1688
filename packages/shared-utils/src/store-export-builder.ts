import { WebProduct, WooCommerceConfig, ShopifyConfig } from "@hub1688/shared-types";

/**
 * Sinh cấu trúc payload chuẩn WooCommerce REST API v3
 */
export function buildWooCommercePayload(product: WebProduct, config?: Partial<WooCommerceConfig>): Record<string, any> {
  const isVariable = (product.variants?.length || 0) > 1;

  const images = [
    ...(product.primaryImage ? [{ src: product.primaryImage, alt: product.titleVI }] : []),
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
    categories: product.categoryName ? [{ name: product.categoryName }] : [],
    images,
    attributes
  };
}

/**
 * Sinh cấu trúc payload chuẩn Shopify Admin REST API
 */
export function buildShopifyPayload(product: WebProduct, config?: Partial<ShopifyConfig>): Record<string, any> {
  const images = [
    ...(product.primaryImage ? [{ src: product.primaryImage, alt: product.titleEN || product.titleVI }] : []),
    ...(product.galleryImages || []).map((img, i) => ({
      src: img,
      alt: `${product.titleEN || product.titleVI} - Detail #${i + 1}`
    }))
  ];

  const shopifyCurrency = config?.currency || "VND";
  const vndPerUsd = config?.exchangeRateVNDToUSD;
  if (shopifyCurrency === "USD" && (!vndPerUsd || vndPerUsd <= 0)) {
    throw new Error("SHOPIFY_EXCHANGE_RATE_REQUIRED");
  }
  const variants = product.variants.map(v => {
    const price = shopifyCurrency === "USD"
      ? (v.sellingPriceVND / vndPerUsd!).toFixed(2)
      : Math.round(v.sellingPriceVND).toString();
    return {
      option1: v.colorNameEN || v.colorName || "Default",
      option2: v.sizeNameEN || v.sizeName || "Freesize",
      price,
      sku: v.sourceSkuId,
      inventory_management: "shopify",
      inventory_quantity: v.stockQuantity
    };
  });

  return {
    product: {
      title: product.titleEN || product.titleVI,
      body_html: product.fullDescEN || product.fullDescVI || "",
      vendor: product.supplierName || "",
      product_type: product.categoryName || "",
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
          "",
          p.titleVI.replace(/"/g, '""'),
          (p.shortDescVI || p.titleVI).replace(/"/g, '""'),
          v.sourceSkuId,
          "Màu Sắc",
          v.colorName || "",
          "Kích Thước",
          v.sizeName || "",
          (v.sellingPriceVND || p.minPriceVND || 0).toString(),
          (v.stockQuantity ?? 0).toString(),
          "",
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
          p.categoryName || "",
          "",
          (p.shortDescVI || p.titleVI).replace(/"/g, '""'),
          "",
          v.colorName || "",
          v.sizeName || "",
          v.sourceSkuId,
          (v.sellingPriceVND || p.minPriceVND || 0).toString(),
          (v.stockQuantity ?? 0).toString(),
          p.primaryImage || ""
        ];
        rows.push(row.map(cell => `"${cell}"`).join(","));
      }
    }
    return rows.join("\n");
  }
}

/**
 * Xuất file CSV theo cấu trúc Shopify Product Import CSV.
 */
export function buildShopifyCSV(products: WebProduct[], config: Pick<ShopifyConfig, "currency" | "exchangeRateVNDToUSD"> = { currency: "VND" }): string {
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
    const variantsToExport = (p.variants || []).filter(v => v.selectedForSale && v.sellingPriceVND > 0);
    if (config.currency === "USD" && (!config.exchangeRateVNDToUSD || config.exchangeRateVNDToUSD <= 0)) {
      throw new Error("SHOPIFY_EXCHANGE_RATE_REQUIRED");
    }

    const allImages = [p.primaryImage, ...(p.galleryImages || [])].filter(Boolean);

    variantsToExport.forEach((v, index) => {
      const isFirst = index === 0;
      const price = config.currency === "USD"
        ? (v.sellingPriceVND / config.exchangeRateVNDToUSD!).toFixed(2)
        : Math.round(v.sellingPriceVND).toString();
      const imageSrc = allImages[index] || (isFirst ? allImages[0] : "");

      const row = [
        handle,
        isFirst ? (p.titleEN || p.titleVI || "").replace(/"/g, '""') : "",
        isFirst ? (p.fullDescEN || p.fullDescVI || p.shortDescVI || "").replace(/"/g, '""') : "",
        p.supplierName || "",
        p.categoryName || "",
        p.categoryName || "",
        (p.focusKeywords || []).join(", "),
        "TRUE",
        "Color",
        v.colorNameEN || v.colorName || "Default",
        "Size",
        v.sizeNameEN || v.sizeName || "Standard",
        v.sourceSkuId,
        "",
        "shopify",
        (v.stockQuantity ?? 0).toString(),
        "deny",
        "manual",
        price,
        "",
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
      p.skuCode || "",
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
      (p.categoryName || "").replace(/"/g, '""'),
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
    const variantsToExport = (p.variants || []).filter(v => v.selectedForSale && v.sellingPriceVND > 0);

    variantsToExport.forEach((v, idx) => {
      const isFirst = idx === 0;
      const imageSrc = (p.galleryImages && p.galleryImages[idx]) || p.primaryImage || "";

      const row = [
        handle,
        isFirst ? (p.titleVI || "").replace(/"/g, '""') : "",
        isFirst ? (p.fullDescVI || p.shortDescVI || "").replace(/"/g, '""') : "",
        p.supplierName || "",
        p.categoryName || "",
        (p.focusKeywords || []).join(", "),
        "true",
        "Màu sắc",
        v.colorName || "Mặc định",
        "Kích thước",
        v.sizeName || "Tiêu chuẩn",
        v.sourceSkuId,
        "",
        "haravan",
        (v.stockQuantity ?? 0).toString(),
        v.sellingPriceVND.toString(),
        "",
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
    ? Math.min(...activeVariants.map(v => Number(v.sellingPriceVND) || 0))
    : 0;
  const maxPrice = activeVariants.length > 0
    ? Math.max(...activeVariants.map(v => Number(v.sellingPriceVND) || 0))
    : minPrice;
  const extractedTitle = typeof raw.title === "string" && raw.title.trim() ? raw.title.trim() : "Sản phẩm chưa có tiêu đề";

  return {
    id: `prod_${raw.offerId || Date.now()}`,
    sourcePlatform: raw.sourcePlatform || "1688",
    sourceProductId: raw.offerId || `src_${Date.now()}`,
    sourceUrl: raw.sourceUrl || "",
    supplierName: raw.shop?.shopName || "",
    categoryName,
    skuCode: `HUB-${raw.offerId || Date.now()}`,
    titleVI: extractedTitle,
    titleEN: extractedTitle,
    slug: extractedTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || `product-${raw.offerId || "draft"}`,
    shortDescVI: `Dữ liệu trích xuất từ nguồn ${raw.sourcePlatform || "1688"}; cần kiểm tra nội dung trước khi đăng bán.`,
    fullDescVI: `<h3>${extractedTitle}</h3><p>Thông tin mô tả chưa được nguồn cung cấp đầy đủ. Vui lòng xác minh và bổ sung trước khi xuất bản.</p>`,
    minPriceVND: minPrice,
    maxPriceVND: maxPrice,
    primaryImage: raw.images?.[0] || "",
    galleryImages: (raw.images || []).slice(1),
    variants: activeVariants.length > 0 ? activeVariants : [
      {
        sourceSkuId: `SKU_${raw.offerId || "default"}`,
        colorName: "Tiêu chuẩn",
        sizeName: "Mặc định",
        costPriceVND: 0,
        sellingPriceVND: minPrice,
        stockQuantity: 0,
        sourceAvailable: false,
        selectedForSale: false
      }
    ],
    qualityScore: 0,
    status: "DRAFT",
    isTitleLocked: false,
    isDescLocked: false,
    isImagesLocked: false,
    isPriceAutoSync: true,
    isStockAutoSync: true,
    focusKeywords: [],
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
  const bankId = params.bankId || params.bankCode;
  if (!bankId?.trim() || !params.accountNo?.trim()) {
    throw new Error("VIETQR_ACCOUNT_REQUIRED");
  }
  const bank = encodeURIComponent(bankId.trim());
  const account = encodeURIComponent(params.accountNo.trim());
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
