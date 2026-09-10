import { WebProduct } from "@hub1688/shared-types";

export const DEMO_MACORNER_PRODUCTS: WebProduct[] = [
  {
    id: "macorner-plaque-family",
    version: 1,
    slug: "bien-mica-den-led-phat-sang-ky-niem-gia-dinh-cap-doi",
    skuCode: "MAC-PLQ-LED-01",
    titleVI: "Biển Mica Đèn LED Phát Sáng Kỷ Niệm Cặp Đôi & Gia Đình (Custom Tên, Ngày Kỷ Niệm & Lời Chúc)",
    titleEN: "Personalized Acrylic Night Light Plaque - Custom Couple / Family Names with Warm Wooden LED Stand",
    shortDescVI: "Biển mica trong suốt cao cấp khắc laser và in UV sắc nét, phát sáng trên đế gỗ tự nhiên ấm áp. Món quà ý nghĩa tặng người yêu, vợ chồng, kỷ niệm ngày cưới hoặc quà tặng tân gia.",
    shortDescEN: "Premium crystal clear acrylic night light with warm wooden LED base. Perfect personalized anniversary, wedding, or home decor gift.",
    fullDescVI: `<h3>Đặc điểm nổi bật của Biển Mica Đèn LED Cá Nhân Hóa Macorner:</h3>
<ul>
  <li><strong>Chất liệu mica Acrylic cao cấp:</strong> Độ trong suốt 99%, chống ố vàng, cắt định hình bo tròn tinh xảo bằng máy laser công nghiệp.</li>
  <li><strong>Công nghệ in UV Nhật Bản:</strong> Mực in nổi chống trầy, bền màu trên 10 năm, không bong tróc khi lau chùi.</li>
  <li><strong>Đế đèn gỗ sồi nguyên khối:</strong> Trang bị dải đèn LED siêu sáng tiết kiệm điện, tỏa ánh sáng vàng ấm dịu mắt hoặc đổi 7 màu với remote. Cắm cổng USB tiện lợi dùng pin sạc dự phòng, củ sạc điện thoại hoặc laptop.</li>
  <li><strong>Tùy biến 100%:</strong> Tự do cá nhân hóa tên bạn và người thương, ngày kỷ niệm khó quên và lời đề tặng chân thành.</li>
</ul>`,
    categoryName: "Biển Mica Đèn LED",
    primaryImage: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&auto=format&fit=crop&q=80",
    galleryImages: [
      "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&auto=format&fit=crop&q=80"
    ],
    status: "PUBLISHED",
    qualityScore: 99,
    minPriceVND: 289000,
    maxPriceVND: 369000,
    isTitleLocked: false,
    isDescLocked: false,
    isImagesLocked: false,
    isPriceAutoSync: true,
    isStockAutoSync: true,
    sourceProductId: "mac-demo-01",
    sourceUrl: "https://macorner.co/products/personalized-acrylic-night-light-plaque",
    supplierName: "Macorner Official Studio",
    rating: 4.98,
    reviewCount: 1450,
    occasionTags: ["anniversary", "valentines", "mothers-day", "christmas", "birthday"],
    recipientTags: ["for-couples", "for-mom", "for-dad", "for-grandparents"],
    
    // Tính năng cá nhân hóa Macorner
    isPersonalized: true,
    customizerMockupTemplateUrl: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&auto=format&fit=crop&q=80",
    personalizationFields: [
      {
        id: "plaque_title",
        label: "1. Tiêu Đề Biển Đèn (Title)",
        type: "SELECT",
        required: true,
        defaultValue: "Together Forever",
        options: [
          { id: "opt-1", label: "Together Forever (Mãi Mãi Bên Nhau)", value: "Together Forever" },
          { id: "opt-2", label: "Home Sweet Home (Tổ Ấm Yêu Thương)", value: "Home Sweet Home" },
          { id: "opt-3", label: "You & Me (Anh & Em)", value: "You & Me" },
          { id: "opt-4", label: "Gia Đình Là Tất Cả", value: "Gia Đình Là Tất Cả" },
          { id: "opt-5", label: "Best Mom In The World 💖", value: "Best Mom In The World" }
        ]
      },
      {
        id: "person_1",
        label: "2. Tên Người Thứ Nhất",
        placeholder: "Vd: Hoàng Nam (hoặc Anh Yêu)",
        type: "TEXT",
        required: true,
        maxLength: 30,
        defaultValue: "Hoàng Nam"
      },
      {
        id: "person_2",
        label: "3. Tên Người Thứ Hai",
        placeholder: "Vd: Khánh Linh (hoặc Em Yêu)",
        type: "TEXT",
        required: true,
        maxLength: 30,
        defaultValue: "Khánh Linh"
      },
      {
        id: "established_year",
        label: "4. Năm hoặc Ngày Kỷ Niệm (Est. Date)",
        placeholder: "Vd: 20.10.2019 hoặc Since 2019",
        type: "TEXT",
        required: false,
        maxLength: 25,
        defaultValue: "Since 2019"
      },
      {
        id: "dedication_quote",
        label: "5. Lời Chúc / Thông Điệp Yêu Thương",
        placeholder: "Vd: Cảm ơn em vì đã đến và làm thế giới của anh trở nên trọn vẹn.",
        type: "TEXTAREA",
        required: false,
        maxLength: 120,
        defaultValue: "Every love story is beautiful, but ours is my favorite."
      }
    ],

    volumeDiscountTiers: [
      { minQty: 1, discountPercent: 0, badgeText: "Mua lẻ 1 cái" },
      { minQty: 2, discountPercent: 10, badgeText: "Mua 2 Giảm 10% (Bán chạy nhất 🔥)", isPopular: true },
      { minQty: 3, discountPercent: 15, badgeText: "Mua 3+ Giảm 15% + FREESHIP 🚚" }
    ],

    giftAddons: [
      {
        id: "addon-gift-box",
        title: "Hộp Quà Nhung Cao Cấp Kèm Nơ Lụa",
        description: "Hộp cứng sang trọng lót xốp nhung đỏ chống sốc, sẵn sàng đem tặng ngay",
        priceVND: 49000,
        originalPriceVND: 80000,
        defaultChecked: true
      },
      {
        id: "addon-card",
        title: "Thiệp Hoa Khô Viết Tay Theo Yêu Cầu",
        description: "Thiệp vintage kèm lời chúc viết tay nắn nót từ shop gửi tặng người nhận",
        priceVND: 29000,
        originalPriceVND: 50000
      },
      {
        id: "addon-priority",
        title: "Ưu Tiên Khắc & Giao Hỏa Tốc",
        description: "Đơn hàng được đưa lên dây chuyền khắc ưu tiên trong 2h",
        priceVND: 20000,
        originalPriceVND: 35000
      }
    ],

    variants: [
      {
        sourceSkuId: "MAC-PLQ-V01",
        colorName: "Đế Gỗ LED Vàng Ấm (Warm White)",
        sizeName: "Size Chuẩn 15x20cm",
        costPriceVND: 120000,
        sellingPriceVND: 289000,
        stockQuantity: 999,
        sourceAvailable: true,
        selectedForSale: true,
        imageUrl: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&auto=format&fit=crop&q=80"
      },
      {
        sourceSkuId: "MAC-PLQ-V02",
        colorName: "Đế Gỗ LED Đổi 7 Màu (Có Remote)",
        sizeName: "Size Chuẩn 15x20cm",
        costPriceVND: 160000,
        sellingPriceVND: 339000,
        stockQuantity: 888,
        sourceAvailable: true,
        selectedForSale: true,
        imageUrl: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop&q=80"
      },
      {
        sourceSkuId: "MAC-PLQ-V03",
        colorName: "Đế Gỗ LED Đổi 7 Màu (Có Remote)",
        sizeName: "Size Lớn 20x25cm",
        costPriceVND: 185000,
        sellingPriceVND: 369000,
        stockQuantity: 650,
        sourceAvailable: true,
        selectedForSale: true,
        imageUrl: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=800&auto=format&fit=crop&q=80"
      }
    ]
  },

  {
    id: "macorner-tumbler-sisters",
    version: 1,
    slug: "ly-giu-nhiet-inox-soul-sisters-besties-chibi",
    skuCode: "MAC-TUM-SIS-02",
    titleVI: "Ly Giữ Nhiệt Inox 304 Khắc Tên 'Soul Sisters / Bạn Thân Chibi' (Tùy Chọn Tóc, Da & Đồ Uống)",
    titleEN: "Personalized Insulated Stainless Steel Tumbler 20oz/30oz - Custom Besties & Soul Sisters",
    shortDescVI: "Ly giữ nhiệt 2 lớp inox 304 chân không giữ đá 24h, giữ nóng 12h. In hình 2 bạn thân chibi sống động, tùy chọn màu da, kiểu tóc, ly cà phê hoặc rượu vang.",
    shortDescEN: "Double-wall vacuum insulated stainless steel tumbler. Custom hairstyles, drinks, names and friendship quote.",
    fullDescVI: `<h3>Món quà hoàn hảo cho nhỏ bạn thân tri kỷ:</h3>
<ul>
  <li>Chất liệu Inox SUS 304 thực phẩm không rỉ sét, nắp trượt chống tràn thông minh có lỗ cắm ống hút.</li>
  <li>Công nghệ in chuyển nhiệt 3D Full HD quanh thân ly, không bong tróc khi rửa nước ấm.</li>
  <li>Dung tích lớn 20oz (600ml) hoặc 30oz (900ml) đựng vừa khay để cốc xe hơi.</li>
</ul>`,
    categoryName: "Ly Giữ Nhiệt & Cốc Sứ",
    primaryImage: "https://images.unsplash.com/photo-1577937927133-66ef06acdf18?w=800&auto=format&fit=crop&q=80",
    galleryImages: [
      "https://images.unsplash.com/photo-1577937927133-66ef06acdf18?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=800&auto=format&fit=crop&q=80"
    ],
    status: "PUBLISHED",
    qualityScore: 98,
    minPriceVND: 259000,
    maxPriceVND: 319000,
    isTitleLocked: false,
    isDescLocked: false,
    isImagesLocked: false,
    isPriceAutoSync: true,
    isStockAutoSync: true,
    sourceProductId: "mac-demo-02",
    sourceUrl: "https://macorner.co/products/personalized-tumbler-besties",
    supplierName: "Macorner Drinkware Lab",
    rating: 4.95,
    reviewCount: 2310,
    occasionTags: ["birthday", "christmas", "anniversary"],
    recipientTags: ["for-besties", "for-couples"],

    isPersonalized: true,
    personalizationFields: [
      {
        id: "girl1_name",
        label: "1. Tên Bạn Thân Bên Trái",
        placeholder: "Vd: Mai Anh",
        type: "TEXT",
        required: true,
        defaultValue: "Mai Anh"
      },
      {
        id: "girl1_hair",
        label: "2. Kiểu Tóc Bạn Thứ Nhất",
        type: "SELECT",
        defaultValue: "Tóc Nâu Xoăn Gợn Sóng",
        options: [
          { id: "h1", label: "Tóc Nâu Xoăn Gợn Sóng (Wavy Brunette)", value: "Tóc Nâu Xoăn Gợn Sóng" },
          { id: "h2", label: "Tóc Vàng Buộc Đuôi Ngựa (Blonde Ponytail)", value: "Tóc Vàng Buộc Đuôi Ngựa" },
          { id: "h3", label: "Tóc Đen Ngắn Cá Tính (Black Bob)", value: "Tóc Đen Ngắn Cá Tính" },
          { id: "h4", label: "Tóc Búi Củ Tỏi Dễ Thương (Messy Bun)", value: "Tóc Búi Củ Tỏi Dễ Thương" }
        ]
      },
      {
        id: "girl1_drink",
        label: "3. Đồ Uống Của Bạn Thứ Nhất",
        type: "SELECT",
        defaultValue: "Ly Cà Phê Iced Latte ☕",
        options: [
          { id: "d1", label: "Ly Cà Phê Iced Latte ☕", value: "Ly Cà Phê Iced Latte" },
          { id: "d2", label: "Ly Rượu Vang Đỏ 🍷", value: "Ly Rượu Vang Đỏ" },
          { id: "d3", label: "Trà Sữa Trân Châu Đường Đen 🧋", value: "Trà Sữa Trân Châu" },
          { id: "d4", label: "Giơ Tay Bắn Tim 🫰", value: "Giơ Tay Bắn Tim" }
        ]
      },
      {
        id: "girl2_name",
        label: "4. Tên Bạn Thân Bên Phải",
        placeholder: "Vd: Phương Thảo",
        type: "TEXT",
        required: true,
        defaultValue: "Phương Thảo"
      },
      {
        id: "girl2_hair",
        label: "5. Kiểu Tóc Bạn Thứ Hai",
        type: "SELECT",
        defaultValue: "Tóc Vàng Buộc Đuôi Ngựa",
        options: [
          { id: "h21", label: "Tóc Vàng Buộc Đuôi Ngựa (Blonde Ponytail)", value: "Tóc Vàng Buộc Đuôi Ngựa" },
          { id: "h22", label: "Tóc Nâu Dài Thẳng Mượt (Long Brunette)", value: "Tóc Nâu Dài Thẳng Mượt" },
          { id: "h23", label: "Tóc Xoăn Xù Mì Đáng Yêu (Afro/Curly)", value: "Tóc Xoăn Xù Mì Đáng Yêu" },
          { id: "h24", label: "Tóc Đỏ Rượu Vang Quyến Rũ (Burgundy)", value: "Tóc Đỏ Rượu Vang Quyến Rũ" }
        ]
      },
      {
        id: "friendship_quote",
        label: "6. Câu Quote Ý Nghĩa Sau Lưng Ly",
        type: "SELECT",
        defaultValue: "Side by side or miles apart, sisters will always be connected by heart",
        options: [
          { id: "q1", label: "Side by side or miles apart, sisters will always be connected by heart 💕", value: "Side by side or miles apart, sisters will always be connected by heart" },
          { id: "q2", label: "You will always be my person. Forever & Always.", value: "You will always be my person. Forever & Always." },
          { id: "q3", label: "Tình bạn diệu kỳ - 10 năm nữa vẫn phải đi trà sữa cùng tao!", value: "Tình bạn diệu kỳ - 10 năm nữa vẫn phải đi trà sữa cùng tao!" },
          { id: "q4", label: "Chance made us colleagues, fun & wine made us besties 🍷", value: "Chance made us colleagues, fun & wine made us besties" }
        ]
      }
    ],

    volumeDiscountTiers: [
      { minQty: 1, discountPercent: 0, badgeText: "Mua lẻ 1 ly" },
      { minQty: 2, discountPercent: 10, badgeText: "Mua Cặp (2 Ly) Giảm 10% 🔥", isPopular: true },
      { minQty: 3, discountPercent: 15, badgeText: "Mua Nhóm (3+ Ly) Giảm 15% + FREESHIP 🚚" }
    ],

    giftAddons: [
      {
        id: "addon-straw-set",
        title: "Bộ 2 Ống Hút Inox 304 Kèm Cọ Rửa",
        description: "Gồm 1 ống thẳng, 1 ống cong và cọ vệ sinh chuyên dụng",
        priceVND: 25000,
        originalPriceVND: 45000,
        defaultChecked: true
      },
      {
        id: "addon-tote-bag",
        title: "Túi Tote Vải Canvas Đựng Ly Tiện Lợi",
        priceVND: 39000,
        originalPriceVND: 70000
      }
    ],

    variants: [
      {
        sourceSkuId: "MAC-TUM-V01",
        colorName: "Màu Trắng Pastel (White Shimmer)",
        sizeName: "20oz Skinny (600ml)",
        costPriceVND: 95000,
        sellingPriceVND: 259000,
        stockQuantity: 500,
        sourceAvailable: true,
        selectedForSale: true,
        imageUrl: "https://images.unsplash.com/photo-1577937927133-66ef06acdf18?w=800&auto=format&fit=crop&q=80"
      },
      {
        sourceSkuId: "MAC-TUM-V02",
        colorName: "Màu Hồng Phấn (Blush Pink)",
        sizeName: "20oz Skinny (600ml)",
        costPriceVND: 95000,
        sellingPriceVND: 259000,
        stockQuantity: 420,
        sourceAvailable: true,
        selectedForSale: true,
        imageUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80"
      },
      {
        sourceSkuId: "MAC-TUM-V03",
        colorName: "Màu Đen Nhám (Matte Black)",
        sizeName: "30oz Cỡ Lớn (900ml)",
        costPriceVND: 125000,
        sellingPriceVND: 319000,
        stockQuantity: 310,
        sourceAvailable: true,
        selectedForSale: true,
        imageUrl: "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=800&auto=format&fit=crop&q=80"
      }
    ]
  },

  {
    id: "macorner-ornament-guitar",
    version: 1,
    slug: "do-treo-cay-thong-noel-mica-hinh-cay-dan-guitar-custom-ten",
    skuCode: "MAC-ORN-GTR-03",
    titleVI: "Đồ Treo Cây Thông Noel Mica Khắc Hình Cây Đàn Guitar (Custom Tên Nghệ Sĩ & Mẫu Đàn)",
    titleEN: "Custom Name, Guitar Type Christmas Gift For Guitarist, Guitar Lovers - Personalized Ornament",
    shortDescVI: "Thiết kế cắt định hình sắc nét theo cây đàn acoustic/electric yêu thích của bạn, khắc tên nghệ sĩ và năm kỷ niệm. Tặng kèm dây dù vàng treo cây thông hoặc gương chiếu hậu ô tô.",
    shortDescEN: "Unique personalized acrylic guitar ornament. Deliberately made for music lovers, guitarist, festive Christmas gifts.",
    fullDescVI: `<h3>Món quà hoàn hảo cho người đam mê âm nhạc:</h3>
<ul>
  <li>Chất liệu Acrylic trong suốt dày 3mm chống vỡ khi rơi.</li>
  <li>Đa dạng mẫu đàn huyền thoại: Acoustic Sunburst, Fender Stratocaster, Gibson Les Paul.</li>
  <li>Tặng kèm dây kim tuyến vàng cao cấp treo trang trí.</li>
</ul>`,
    categoryName: "Đồ Treo Cây Thông & Xe Hơi",
    primaryImage: "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800&auto=format&fit=crop&q=80",
    galleryImages: [
      "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1525201548942-d8732f6617a0?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80"
    ],
    status: "PUBLISHED",
    qualityScore: 97,
    minPriceVND: 149000,
    maxPriceVND: 199000,
    isTitleLocked: false,
    isDescLocked: false,
    isImagesLocked: false,
    isPriceAutoSync: true,
    isStockAutoSync: true,
    sourceProductId: "mac-demo-03",
    sourceUrl: "https://macorner.co/products/custom-name-guitar-type-christmas-gift-for-guitarist-guitar-lovers-personalized-ornament-mahqz57hq",
    supplierName: "Macorner Acrylic Studio",
    rating: 4.96,
    reviewCount: 870,
    occasionTags: ["christmas", "birthday"],
    recipientTags: ["for-dad", "for-besties", "for-couples"],

    isPersonalized: true,
    personalizationFields: [
      {
        id: "guitarist_name",
        label: "1. Tên Người Được Tặng (Nhạc Công)",
        placeholder: "Vd: John Mayer hoặc Minh Tuấn",
        type: "TEXT",
        required: true,
        defaultValue: "Minh Tuấn"
      },
      {
        id: "guitar_type",
        label: "2. Chọn Mẫu Đàn Yêu Thích",
        type: "SELECT",
        defaultValue: "Acoustic Sunburst Cổ Điển",
        options: [
          { id: "g1", label: "Acoustic Sunburst Cổ Điển (Gỗ nâu ấm)", value: "Acoustic Sunburst Cổ Điển" },
          { id: "g2", label: "Fender Stratocaster Xanh Electric Rock", value: "Fender Stratocaster Xanh Electric Rock" },
          { id: "g3", label: "Gibson Les Paul Vàng Gold Vintage", value: "Gibson Les Paul Vàng Gold Vintage" },
          { id: "g4", label: "Guitar Bass Đỏ Cherry Nổi Bật", value: "Guitar Bass Đỏ Cherry Nổi Bật" }
        ]
      },
      {
        id: "ornament_year",
        label: "3. Năm Kỷ Niệm (Year)",
        placeholder: "Vd: 2026",
        type: "TEXT",
        required: false,
        defaultValue: "2026"
      }
    ],

    volumeDiscountTiers: [
      { minQty: 1, discountPercent: 0, badgeText: "1 Móc treo" },
      { minQty: 3, discountPercent: 15, badgeText: "Combo 3 Móc Giảm 15% 🔥", isPopular: true },
      { minQty: 5, discountPercent: 25, badgeText: "Combo 5 Móc Giảm 25% + FREESHIP 🚚" }
    ],

    variants: [
      {
        sourceSkuId: "MAC-ORN-V01",
        colorName: "Mica Trong Suốt (Clear Acrylic)",
        sizeName: "3.5 Inches (9 cm)",
        costPriceVND: 35000,
        sellingPriceVND: 149000,
        stockQuantity: 1000,
        sourceAvailable: true,
        selectedForSale: true,
        imageUrl: "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800&auto=format&fit=crop&q=80"
      },
      {
        sourceSkuId: "MAC-ORN-V02",
        colorName: "Mica Trong Suốt (Clear Acrylic)",
        sizeName: "4.5 Inches (11.5 cm)",
        costPriceVND: 45000,
        sellingPriceVND: 179000,
        stockQuantity: 800,
        sourceAvailable: true,
        selectedForSale: true,
        imageUrl: "https://images.unsplash.com/photo-1525201548942-d8732f6617a0?w=800&auto=format&fit=crop&q=80"
      },
      {
        sourceSkuId: "MAC-ORN-V03",
        colorName: "Mica Trong Suốt (Clear Acrylic)",
        sizeName: "5.5 Inches (14 cm) Cực Lớn",
        costPriceVND: 55000,
        sellingPriceVND: 199000,
        stockQuantity: 600,
        sourceAvailable: true,
        selectedForSale: true,
        imageUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80"
      }
    ]
  },

  {
    id: "macorner-pet-memorial",
    version: 1,
    slug: "tranh-mica-den-led-tuong-nho-thu-cung-forever-in-our-hearts",
    skuCode: "MAC-PET-MEM-04",
    titleVI: "Tranh Mica Để Bàn Đèn LED Tưởng Nhớ Thú Cưng 'Forever In My Heart' (Custom Giống Chó Mèo & Cánh Thiên Thần)",
    titleEN: "Personalized Dog / Cat Memorial Acrylic Night Light - Custom Breed & Angel Wings",
    shortDescVI: "Lưu giữ ký ức ngọt ngào về bé cún/mèo thân yêu. Tùy biến hình ảnh giống chó mèo, tên bé, năm sinh - mất và đôi cánh thiên thần phát sáng nhẹ nhàng.",
    shortDescEN: "Heartfelt pet memorial gift. Beautiful acrylic night light with glowing halo and wings for your beloved furry friend.",
    categoryName: "Tưởng Nhớ & Thú Cưng",
    primaryImage: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&auto=format&fit=crop&q=80",
    galleryImages: [
      "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?w=800&auto=format&fit=crop&q=80"
    ],
    status: "PUBLISHED",
    qualityScore: 100,
    minPriceVND: 279000,
    maxPriceVND: 349000,
    isTitleLocked: false,
    isDescLocked: false,
    isImagesLocked: false,
    isPriceAutoSync: true,
    isStockAutoSync: true,
    sourceProductId: "mac-demo-04",
    sourceUrl: "https://macorner.co/products/personalized-pet-memorial-plaque",
    supplierName: "Macorner Memorial Workshop",
    rating: 5.0,
    reviewCount: 3420,
    occasionTags: ["memorial"],
    recipientTags: ["for-pet-lovers"],

    isPersonalized: true,
    personalizationFields: [
      {
        id: "pet_name",
        label: "1. Tên Thú Cưng Yêu Quý",
        placeholder: "Vd: Bơ, Lucky, Milo, Cún...",
        type: "TEXT",
        required: true,
        defaultValue: "Milo"
      },
      {
        id: "pet_breed",
        label: "2. Chọn Giống Chó / Mèo Cưng",
        type: "SELECT",
        defaultValue: "Corgi Mông Tròn",
        options: [
          { id: "b1", label: "Chó Corgi Mông Tròn Đáng Yêu", value: "Corgi Mông Tròn" },
          { id: "b2", label: "Chó Golden Retriever Lông Vàng", value: "Golden Retriever" },
          { id: "b3", label: "Chó Poodle Lông Xoăn Nâu", value: "Poodle Nâu Xoăn" },
          { id: "b4", label: "Chó Husky Ngáo Mắt Xanh", value: "Husky Ngáo" },
          { id: "b5", label: "Chó Phốc Sóc Trắng Tuyết", value: "Phốc Sóc Trắng" },
          { id: "b6", label: "Mèo Anh Lông Ngắn Xám Xanh", value: "Mèo Anh Lông Ngắn" },
          { id: "b7", label: "Mèo Tam Thể Dễ Thương", value: "Mèo Tam Thể" },
          { id: "b8", label: "Mèo Mướp Vàng Tinh Nghịch", value: "Mèo Mướp Vàng" }
        ]
      },
      {
        id: "angel_wings",
        label: "3. Cánh Thiên Thần & Vòng Hào Quang",
        type: "SELECT",
        defaultValue: "Có Cánh Thiên Thần & Vòng Hào Quang 🪽",
        options: [
          { id: "w1", label: "Có Cánh Thiên Thần & Vòng Hào Quang 🪽 (Memorial)", value: "Có Cánh Thiên Thần & Vòng Hào Quang" },
          { id: "w2", label: "Không Có Cánh (Bé vẫn khỏe mạnh bên gia đình) ❤️", value: "Không Có Cánh" }
        ]
      },
      {
        id: "pet_years",
        label: "4. Năm Gắn Bó",
        placeholder: "Vd: 2016 - 2025 hoặc Forever",
        type: "TEXT",
        required: false,
        defaultValue: "2016 - 2025"
      },
      {
        id: "pet_quote",
        label: "5. Lời Nhắn Gửi Thiên Thần Nhỏ",
        type: "SELECT",
        defaultValue: "You were my favorite hello and my hardest goodbye",
        options: [
          { id: "pq1", label: "You were my favorite hello and my hardest goodbye 🐾", value: "You were my favorite hello and my hardest goodbye" },
          { id: "pq2", label: "No longer by my side, but forever in my heart ❤️", value: "No longer by my side, but forever in my heart" },
          { id: "pq3", label: "Gặp được em là điều may mắn nhất trong cuộc đời của tôi.", value: "Gặp được em là điều may mắn nhất trong cuộc đời của tôi." }
        ]
      }
    ],

    volumeDiscountTiers: [
      { minQty: 1, discountPercent: 0, badgeText: "Mua 1 bảng" },
      { minQty: 2, discountPercent: 12, badgeText: "Mua 2 bảng Giảm 12% 🔥", isPopular: true }
    ],

    variants: [
      {
        sourceSkuId: "MAC-PET-V01",
        colorName: "Đế Gỗ Tự Nhiên Ánh Sáng Vàng Ấm",
        sizeName: "15 x 20 cm",
        costPriceVND: 110000,
        sellingPriceVND: 279000,
        stockQuantity: 500,
        sourceAvailable: true,
        selectedForSale: true,
        imageUrl: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&auto=format&fit=crop&q=80"
      },
      {
        sourceSkuId: "MAC-PET-V02",
        colorName: "Đế Gỗ Đổi 7 Màu Kèm Remote",
        sizeName: "15 x 20 cm",
        costPriceVND: 145000,
        sellingPriceVND: 349000,
        stockQuantity: 400,
        sourceAvailable: true,
        selectedForSale: true,
        imageUrl: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800&auto=format&fit=crop&q=80"
      }
    ]
  },

  {
    id: "macorner-doormat-doghouse",
    version: 1,
    slug: "tham-chui-chan-welcome-to-the-dog-house-custom-ten",
    skuCode: "MAC-MAT-DOG-05",
    titleVI: "Thảm Chùi Chân Chống Trượt 'Welcome to the Dog House' (Custom Tên Gia Đình & Cún Cưng)",
    titleEN: "Personalized Welcome to the Dog House Coir Doormat - Custom Pet Breeds & Names",
    shortDescVI: "Thảm xơ dừa tự nhiên đế cao su chống trượt tuyệt đối. In hình hài hước đàn cún cưng chào đón khách đến chơi nhà.",
    shortDescEN: "High-quality durable non-slip doormat. Personalized with your dogs names and cute illustrations.",
    categoryName: "Trang Trí Nhà Cửa",
    primaryImage: "https://images.unsplash.com/photo-1588854337236-6889d631faa8?w=800&auto=format&fit=crop&q=80",
    galleryImages: [
      "https://images.unsplash.com/photo-1588854337236-6889d631faa8?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1517849845537-4d257902454a?w=800&auto=format&fit=crop&q=80"
    ],
    status: "PUBLISHED",
    qualityScore: 96,
    minPriceVND: 229000,
    maxPriceVND: 289000,
    isTitleLocked: false,
    isDescLocked: false,
    isImagesLocked: false,
    isPriceAutoSync: true,
    isStockAutoSync: true,
    sourceProductId: "mac-demo-05",
    sourceUrl: "https://macorner.co/products/personalized-welcome-to-the-dog-house-doormat",
    supplierName: "Macorner Home Living",
    rating: 4.92,
    reviewCount: 950,
    occasionTags: ["birthday", "christmas", "anniversary"],
    recipientTags: ["for-pet-lovers", "for-couples", "for-mom", "for-dad"],

    isPersonalized: true,
    personalizationFields: [
      {
        id: "family_name",
        label: "1. Tên Gia Đình Hoặc Chủ Nhà",
        placeholder: "Vd: Nhà Của Nam & Lan",
        type: "TEXT",
        required: true,
        defaultValue: "Nhà Của Nam & Lan"
      },
      {
        id: "dog_names",
        label: "2. Tên Các Bé Cún (cách nhau dấu phẩy)",
        placeholder: "Vd: Bơ, Milo, Xúc Xích",
        type: "TEXT",
        required: true,
        defaultValue: "Bơ, Milo"
      },
      {
        id: "warning_text",
        label: "3. Dòng Cảnh Báo Hài Hước",
        type: "SELECT",
        defaultValue: "Khách đến xin hãy chuẩn bị tinh thần bị các boss liếm kín mặt!",
        options: [
          { id: "w1", label: "Khách đến xin hãy chuẩn bị tinh thần bị các boss liếm kín mặt! 🐶", value: "Khách đến xin hãy chuẩn bị tinh thần bị các boss liếm kín mặt!" },
          { id: "w2", label: "The dogs live here, you are just a visitor!", value: "The dogs live here, you are just a visitor!" },
          { id: "w3", label: "Xin vui lòng gõ cửa, nếu không các boss sẽ sủa thay chuông!", value: "Xin vui lòng gõ cửa, nếu không các boss sẽ sủa thay chuông!" }
        ]
      }
    ],

    volumeDiscountTiers: [
      { minQty: 1, discountPercent: 0, badgeText: "1 Thảm" },
      { minQty: 2, discountPercent: 10, badgeText: "Mua 2 Thảm Giảm 10% (Trong nhà & Ngoài sân) 🔥", isPopular: true }
    ],

    variants: [
      {
        sourceSkuId: "MAC-MAT-V01",
        colorName: "Nâu Xơ Dừa Cổ Điển",
        sizeName: "40 x 60 cm (Cỡ Cửa Tiêu Chuẩn)",
        costPriceVND: 80000,
        sellingPriceVND: 229000,
        stockQuantity: 400,
        sourceAvailable: true,
        selectedForSale: true,
        imageUrl: "https://images.unsplash.com/photo-1588854337236-6889d631faa8?w=800&auto=format&fit=crop&q=80"
      },
      {
        sourceSkuId: "MAC-MAT-V02",
        colorName: "Nâu Xơ Dừa Cổ Điển",
        sizeName: "50 x 80 cm (Cỡ Lớn Sang Trọng)",
        costPriceVND: 110000,
        sellingPriceVND: 289000,
        stockQuantity: 300,
        sourceAvailable: true,
        selectedForSale: true,
        imageUrl: "https://images.unsplash.com/photo-1588854337236-6889d631faa8?w=800&auto=format&fit=crop&q=80"
      }
    ]
  },

  {
    id: "macorner-shirt-family-squad",
    version: 1,
    slug: "ao-thun-cotton-gia-dinh-squad-chibi-custom-ten",
    skuCode: "MAC-TSH-FAM-06",
    titleVI: "Áo Thun Cotton 100% In Chibi Biệt Đội Gia Đình / Hội Bạn Thân (Custom Tên Từng Thành Viên)",
    titleEN: "Custom Personalized Family / Squad Members Heavy Cotton T-Shirt",
    shortDescVI: "Áo thun cotton 4 chiều co giãn thoáng mát, thấm hút mồ hôi. In hình đại gia đình hoặc nhóm bạn thân với tên và phong cách riêng cho từng người.",
    shortDescEN: "100% premium combed cotton t-shirt with high-definition digital direct-to-garment (DTG) print.",
    categoryName: "Thời Trang & Quần Áo",
    primaryImage: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80",
    galleryImages: [
      "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&auto=format&fit=crop&q=80"
    ],
    status: "PUBLISHED",
    qualityScore: 97,
    minPriceVND: 199000,
    maxPriceVND: 219000,
    isTitleLocked: false,
    isDescLocked: false,
    isImagesLocked: false,
    isPriceAutoSync: true,
    isStockAutoSync: true,
    sourceProductId: "mac-demo-06",
    sourceUrl: "https://macorner.co/products/personalized-family-t-shirt",
    supplierName: "Macorner Apparel Studio",
    rating: 4.88,
    reviewCount: 1150,
    occasionTags: ["mothers-day", "fathers-day", "birthday", "christmas"],
    recipientTags: ["for-mom", "for-dad", "for-grandparents", "for-couples"],

    isPersonalized: true,
    personalizationFields: [
      {
        id: "squad_title",
        label: "1. Tên Biệt Đội / Gia Đình",
        placeholder: "Vd: Gia Đình Bánh Mì hoặc The Best Squad",
        type: "TEXT",
        required: true,
        defaultValue: "Happy Family"
      },
      {
        id: "member_names",
        label: "2. Tên Các Thành Viên (cách nhau dấu phẩy)",
        placeholder: "Vd: Bố Dũng, Mẹ Lan, Bé Bo, Bé Bông",
        type: "TEXT",
        required: true,
        defaultValue: "Bố Dũng, Mẹ Lan, Bé Bo"
      }
    ],

    volumeDiscountTiers: [
      { minQty: 1, discountPercent: 0, badgeText: "Mua 1 áo" },
      { minQty: 3, discountPercent: 15, badgeText: "Đồng phục Gia Đình (3+ áo) Giảm 15% 🔥", isPopular: true },
      { minQty: 5, discountPercent: 20, badgeText: "Hội nhóm (5+ áo) Giảm 20% + FREESHIP 🚚" }
    ],

    variants: [
      {
        sourceSkuId: "MAC-TSH-V01",
        colorName: "Màu Trắng (White)",
        sizeName: "Size L (55-68 kg)",
        costPriceVND: 70000,
        sellingPriceVND: 199000,
        stockQuantity: 500,
        sourceAvailable: true,
        selectedForSale: true,
        imageUrl: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80"
      },
      {
        sourceSkuId: "MAC-TSH-V02",
        colorName: "Màu Đen (Black)",
        sizeName: "Size XL (68-78 kg)",
        costPriceVND: 70000,
        sellingPriceVND: 199000,
        stockQuantity: 450,
        sourceAvailable: true,
        selectedForSale: true,
        imageUrl: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&auto=format&fit=crop&q=80"
      }
    ]
  }
];
