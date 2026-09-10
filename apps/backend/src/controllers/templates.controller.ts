import { Request, Response } from "express";
import { ProductTemplate } from "@hub1688/shared-types";

// In-memory store initialized with 4 rich starter templates
let templatesStore: ProductTemplate[] = [
  {
    id: "tpl-pod-macorner",
    name: "Quà Tặng Cá Nhân Hóa (POD / Macorner)",
    description: "Mẫu chuyên dụng cho quà tặng in ấn tùy biến theo tên/thông điệp, chuẩn matrix Macorner",
    categoryName: "Quà Tặng & In Ấn (POD)",
    targetPlatform: "ALL",
    isDefault: true,
    content: {
      titlePrefix: "[Quà Tặng Ý Nghĩa]",
      titleSuffix: "- Khắc Tên Theo Yêu Cầu Cao Cấp",
      titleFormula: "{prefix} {title} {suffix}",
      shortDescVI: "Sản phẩm quà tặng cá nhân hóa cao cấp, tùy chỉnh tên & thông điệp riêng theo yêu cầu. Hoàn thiện tinh xảo, độ bền vượt trội.",
      shortDescEN: "Personalized premium gift, customized with names and messages. Exquisite finish and superior durability.",
      fullDescVI: `### 🌟 ĐIỂM NỔI BẬT CỦA SẢN PHẨM
- **Tùy biến 100% cá nhân hóa**: Dễ dàng tùy chỉnh tên, thông điệp, hình ảnh theo yêu cầu riêng của bạn.
- **Chất liệu cao cấp**: Chế tác từ vật liệu bền đẹp, màu in UV sắc nét không phai theo thời gian.
- **Đóng gói sang trọng**: Tặng kèm hộp quà cứng cáp và nơ trang nhã, sẵn sàng làm quà tặng người thân yêu.

### 📐 THÔNG TIN CHI TIẾT
- **Kích thước**: Đa dạng các size tiêu chuẩn, phù hợp bài trí bàn làm việc, phòng ngủ hoặc phòng khách.
- **Xuất xứ**: Xưởng sản xuất thủ công tiêu chuẩn xuất khẩu.
- **Phụ kiện kèm theo**: Hướng dẫn sử dụng & bảo quản chuyên dụng.

### 🛡️ CAM KẾT & CHÍNH SÁCH BẢO HÀNH
- Đổi mới 100% trong vòng 30 ngày nếu phát hiện lỗi in ấn hoặc lỗi do sản xuất.
- Kiểm tra hàng trước khi thanh toán.
- Hỗ trợ thiết kế và xem trước mẫu in hoàn toàn miễn phí.`,
      attributes: [
        { key: "Chất liệu", value: "Gỗ tự nhiên / Acrylic chống trầy" },
        { key: "Loại in ấn", value: "In UV độ phân giải cao, chống nước tuyệt đối" },
        { key: "Xuất xứ", value: "Việt Nam / Nhập khẩu" },
        { key: "Dịp tặng phù hợp", value: "Sinh nhật, Lễ tình nhân, Kỷ niệm, Halloween, Giáng Sinh" }
      ],
      warrantyPolicy: "Bảo hành 1 đổi 1 trong vòng 30 ngày đối với lỗi in ấn hoặc hư hỏng trong quá trình vận chuyển.",
      shippingPolicy: "Giao hàng toàn quốc 2-4 ngày. Đóng gói 3 lớp chống sốc chuyên dụng.",
      focusKeywords: ["quà tặng cá nhân hóa", "quà tặng in tên", "quà tặng độc đáo", "personalized gift"],
      faqs: [
        { question: "Tôi có thể xem trước mẫu thiết kế trước khi in không?", answer: "Có, shop sẽ gửi bản xem trước (mockup) qua Zalo/Tin nhắn để quý khách xác nhận trước khi tiến hành in ấn." },
        { question: "Thời gian hoàn thiện và giao hàng mất bao lâu?", answer: "Thời gian sản xuất thường mất từ 1-2 ngày làm việc, sau đó vận chuyển đến bạn từ 2-3 ngày." }
      ]
    },
    variation: {
      options: [
        { name: "Kích thước (Size)", values: ["Size Vừa (7x9 inch)", "Size Lớn (9x10 inch)"] },
        { name: "Combo / Đóng gói", values: ["1 PCS (Đơn)", "Combo 2 PCS (Tiết Kiệm 10%)", "Combo 4 PCS (Gia Đình)", "Combo 6 PCS (Đại Gia Đình)"] }
      ],
      defaultStock: 999,
      skuPattern: "{SKU}-{SIZE}-{COMBO}",
      predefinedVariants: [
        { name: "Size Vừa (7x9 inch) / 1 PCS (Đơn)", option1: "Size Vừa (7x9 inch)", option2: "1 PCS (Đơn)", priceAdjustmentVND: 0, stock: 999 },
        { name: "Size Vừa (7x9 inch) / Combo 2 PCS (Tiết Kiệm 10%)", option1: "Size Vừa (7x9 inch)", option2: "Combo 2 PCS (Tiết Kiệm 10%)", priceAdjustmentVND: 120000, stock: 999 },
        { name: "Size Vừa (7x9 inch) / Combo 4 PCS (Gia Đình)", option1: "Size Vừa (7x9 inch)", option2: "Combo 4 PCS (Gia Đình)", priceAdjustmentVND: 320000, stock: 999 },
        { name: "Size Vừa (7x9 inch) / Combo 6 PCS (Đại Gia Đình)", option1: "Size Vừa (7x9 inch)", option2: "Combo 6 PCS (Đại Gia Đình)", priceAdjustmentVND: 500000, stock: 999 },
        { name: "Size Lớn (9x10 inch) / 1 PCS (Đơn)", option1: "Size Lớn (9x10 inch)", option2: "1 PCS (Đơn)", priceAdjustmentVND: 45000, stock: 999 },
        { name: "Size Lớn (9x10 inch) / Combo 2 PCS (Tiết Kiệm 10%)", option1: "Size Lớn (9x10 inch)", option2: "Combo 2 PCS (Tiết Kiệm 10%)", priceAdjustmentVND: 180000, stock: 999 },
        { name: "Size Lớn (9x10 inch) / Combo 4 PCS (Gia Đình)", option1: "Size Lớn (9x10 inch)", option2: "Combo 4 PCS (Gia Đình)", priceAdjustmentVND: 420000, stock: 999 },
        { name: "Size Lớn (9x10 inch) / Combo 6 PCS (Đại Gia Đình)", option1: "Size Lớn (9x10 inch)", option2: "Combo 6 PCS (Đại Gia Đình)", priceAdjustmentVND: 650000, stock: 999 }
      ]
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "tpl-fashion-unisex",
    name: "Thời Trang Unisex Hot Trend",
    description: "Mẫu đăng bán quần áo, áo thun Oversize Unisex chuẩn size Việt Nam S đến 2XL",
    categoryName: "Thời Trang & May Mặc",
    targetPlatform: "ALL",
    isDefault: false,
    content: {
      titlePrefix: "[Cao Cấp]",
      titleSuffix: "- Vải Cotton 100% Form Rộng Unisex Hot Trend",
      titleFormula: "{prefix} {title} {suffix}",
      shortDescVI: "Áo thun phong cách Streetwear Unisex form rộng thoải mái, chất vải Cotton 2 chiều dày 250gsm thoáng mát, thấm hút mồ hôi cực tốt.",
      fullDescVI: `### 👕 THÔNG TIN SẢN PHẨM
- **Chất liệu**: 100% Cotton định lượng 250gsm, mềm mịn, không xù lông sau nhiều lần giặt.
- **Form dáng**: Oversize Unisex chuẩn Hàn Quốc, phù hợp cho cả nam và nữ.
- **Kỹ thuật in/thêu**: Công nghệ in PET cao cấp bền màu, không bong tróc khi giặt máy.

### 📏 BẢNG SIZE CHUẨN
- Size S: 40 - 52kg (Cao 1m50 - 1m62)
- Size M: 53 - 65kg (Cao 1m60 - 1m70)
- Size L: 66 - 76kg (Cao 1m68 - 1m77)
- Size XL: 77 - 88kg (Cao 1m75 - 1m85)
- Size 2XL: 89 - 100kg (Cao 1m80 - 1m92)

### 🧺 HƯỚNG DẪN BẢO QUẢN
- Lộn trái áo khi giặt và phơi để giữ hình in bền đẹp nhất.
- Không ngâm lâu trong xà phòng có độ tẩy rửa mạnh.
- Ủi ở nhiệt độ trung bình, tránh ủi trực tiếp lên hình in.`,
      attributes: [
        { key: "Chất liệu", value: "100% Cotton 2 chiều cao cấp" },
        { key: "Phong cách", value: "Streetwear, Casual Unisex" },
        { key: "Mùa thích hợp", value: "Bốn mùa" },
        { key: "Xuất xứ", value: "Việt Nam xuất khẩu" }
      ],
      warrantyPolicy: "Đổi size miễn phí trong 7 ngày nếu không vừa vặn. Đổi mới lập tức do lỗi đường may từ xưởng.",
      shippingPolicy: "Đóng hộp carton bảo vệ form áo, giao nhanh 1-3 ngày toàn quốc.",
      focusKeywords: ["áo thun unisex", "áo phông form rộng", "áo oversize cotton", "thời trang streetwear"]
    },
    variation: {
      options: [
        { name: "Kích thước (Size)", values: ["Size S", "Size M", "Size L", "Size XL", "Size 2XL"] },
        { name: "Màu sắc (Color)", values: ["Đen Basic", "Trắng Tinh Khôi", "Xám Khói", "Nâu Be Vintage"] }
      ],
      defaultStock: 200,
      skuPattern: "{SKU}-{SIZE}-{COLOR}",
      predefinedVariants: [
        { name: "Size S / Đen Basic", option1: "Size S", option2: "Đen Basic", priceAdjustmentVND: 0, stock: 200 },
        { name: "Size M / Đen Basic", option1: "Size M", option2: "Đen Basic", priceAdjustmentVND: 0, stock: 200 },
        { name: "Size L / Đen Basic", option1: "Size L", option2: "Đen Basic", priceAdjustmentVND: 0, stock: 200 },
        { name: "Size XL / Đen Basic", option1: "Size XL", option2: "Đen Basic", priceAdjustmentVND: 0, stock: 200 },
        { name: "Size 2XL / Đen Basic", option1: "Size 2XL", option2: "Đen Basic", priceAdjustmentVND: 10000, stock: 200 },
        { name: "Size S / Trắng Tinh Khôi", option1: "Size S", option2: "Trắng Tinh Khôi", priceAdjustmentVND: 0, stock: 200 },
        { name: "Size M / Trắng Tinh Khôi", option1: "Size M", option2: "Trắng Tinh Khôi", priceAdjustmentVND: 0, stock: 200 },
        { name: "Size L / Trắng Tinh Khôi", option1: "Size L", option2: "Trắng Tinh Khôi", priceAdjustmentVND: 0, stock: 200 },
        { name: "Size XL / Trắng Tinh Khôi", option1: "Size XL", option2: "Trắng Tinh Khôi", priceAdjustmentVND: 0, stock: 200 },
        { name: "Size 2XL / Trắng Tinh Khôi", option1: "Size 2XL", option2: "Trắng Tinh Khôi", priceAdjustmentVND: 10000, stock: 200 }
      ]
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "tpl-smart-home",
    name: "Đồ Gia Dụng Thông Minh & Đời Sống",
    description: "Mẫu gia dụng thông minh, cam kết bảo hành 12 tháng, đổi trả 1 đổi 1",
    categoryName: "Gia Dụng & Đời Sống",
    targetPlatform: "ALL",
    isDefault: false,
    content: {
      titlePrefix: "[Chính Hãng]",
      titleSuffix: "- Bảo Hành 12 Tháng Lỗi 1 Đổi 1 Toàn Quốc",
      titleFormula: "{prefix} {title} {suffix}",
      shortDescVI: "Thiết bị tiện ích thông minh thế hệ mới, tiết kiệm thời gian, tối ưu không gian sống cho gia đình hiện đại.",
      fullDescVI: `### 🏡 GIẢI PHÁP TIỆN ÍCH CHO GIA ĐÌNH HIỆN ĐẠI
- **Thiết kế tinh gọn**: Tiết kiệm diện tích, nâng tầm thẩm mỹ căn bếp và không gian nhà bạn.
- **Tiết kiệm năng lượng**: Động cơ thế hệ mới êm ái, bền bỉ và tiết kiệm điện năng tối đa.
- **Dễ dàng sử dụng**: Thao tác một chạm trực quan, người lớn tuổi và trẻ nhỏ đều thao tác thuận tiện.

### 🛡️ CAM KẾT VÀ BẢO HÀNH
- Sản phẩm chính hãng 100%, nguyên seal đóng gói.
- Bảo hành điện tử chính hãng 12 tháng trên toàn quốc.
- Hỗ trợ kỹ thuật và giải đáp thắc mắc 24/7.`,
      attributes: [
        { key: "Điện áp", value: "220V - 50Hz" },
        { key: "Chất liệu", value: "Nhựa ABS nguyên sinh & Inox 304 không gỉ" },
        { key: "Bảo hành", value: "12 tháng chính hãng" }
      ],
      warrantyPolicy: "Bảo hành chính hãng 12 tháng. 1 đổi 1 trong 30 ngày nếu có lỗi từ nhà sản xuất.",
      shippingPolicy: "Đóng thùng bọt xốp 2 lớp chống va đập, bảo hiểm toàn diện khi vận chuyển.",
      focusKeywords: ["gia dụng thông minh", "thiết bị gia đình", "đồ dùng nhà bếp tiện ích"]
    },
    variation: {
      options: [
        { name: "Phiên bản (Model)", values: ["Bản Tiêu Chuẩn", "Bản Nâng Cấp (Kèm Phụ Kiện)", "Bản Cao Cấp Full Box"] }
      ],
      defaultStock: 150,
      skuPattern: "{SKU}-{MODEL}",
      predefinedVariants: [
        { name: "Bản Tiêu Chuẩn", option1: "Bản Tiêu Chuẩn", priceAdjustmentVND: 0, stock: 150 },
        { name: "Bản Nâng Cấp (Kèm Phụ Kiện)", option1: "Bản Nâng Cấp (Kèm Phụ Kiện)", priceAdjustmentVND: 80000, stock: 150 },
        { name: "Bản Cao Cấp Full Box", option1: "Bản Cao Cấp Full Box", priceAdjustmentVND: 180000, stock: 150 }
      ]
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "tpl-tech-gadgets",
    name: "Phụ Kiện Điện Tử & Smartwatch",
    description: "Mẫu sản phẩm điện tử, phụ kiện đồng hồ thông minh đa màu sắc và chất liệu",
    categoryName: "Công Nghệ & Phụ Kiện",
    targetPlatform: "ALL",
    isDefault: false,
    content: {
      titlePrefix: "[Công Nghệ Mới]",
      titleSuffix: "- Tương Thích Mọi Thiết Bị - Kháng Nước IP68",
      titleFormula: "{prefix} {title} {suffix}",
      shortDescVI: "Phụ kiện công nghệ cao cấp, độ tương thích hoàn hảo, chống nước chuẩn IP68 và độ bền vượt trội.",
      fullDescVI: `### ⚡ CÔNG NGHỆ ĐỘT PHÁ
- **Chất liệu gia công cao cấp**: Chống trầy xước, chịu lực va đập vượt trội.
- **Tiêu chuẩn kháng nước IP68**: An tâm sử dụng đi mưa, vận động thể thao hoặc bơi lội nhẹ.
- **Bảo hành 6 tháng**: Đổi mới lập tức nếu phát sinh lỗi kỹ thuật từ nhà sản xuất.`,
      attributes: [
        { key: "Chống nước", value: "IP68" },
        { key: "Tương thích", value: "iOS / Android / Universal" },
        { key: "Vật liệu hoàn thiện", value: "Hợp kim nhôm & Kính cường lực" }
      ],
      warrantyPolicy: "Bảo hành 6 tháng 1 đổi 1.",
      shippingPolicy: "Đóng gói túi bóng khí và hộp carton cứng cáp, đồng kiểm khi nhận hàng.",
      focusKeywords: ["phụ kiện công nghệ", "smartwatch", "chống nước IP68"]
    },
    variation: {
      options: [
        { name: "Màu khung máy", values: ["Đen Nhám (Space Black)", "Bạc Ánh Kim (Silver)", "Vàng Hồng (Rose Gold)"] },
        { name: "Loại Dây Đeo", values: ["Dây Silicon Thể Thao", "Dây Thép Milanese Chống Gỉ", "Dây Da Bò Cao Cấp"] }
      ],
      defaultStock: 100,
      skuPattern: "{SKU}-{COLOR}-{STRAP}",
      predefinedVariants: [
        { name: "Đen Nhám / Dây Silicon", option1: "Đen Nhám (Space Black)", option2: "Dây Silicon Thể Thao", priceAdjustmentVND: 0, stock: 100 },
        { name: "Đen Nhám / Dây Thép Milanese", option1: "Đen Nhám (Space Black)", option2: "Dây Thép Milanese Chống Gỉ", priceAdjustmentVND: 50000, stock: 100 },
        { name: "Đen Nhám / Dây Da Bò", option1: "Đen Nhám (Space Black)", option2: "Dây Da Bò Cao Cấp", priceAdjustmentVND: 80000, stock: 100 },
        { name: "Bạc Ánh Kim / Dây Silicon", option1: "Bạc Ánh Kim (Silver)", option2: "Dây Silicon Thể Thao", priceAdjustmentVND: 0, stock: 100 },
        { name: "Bạc Ánh Kim / Dây Thép Milanese", option1: "Bạc Ánh Kim (Silver)", option2: "Dây Thép Milanese Chống Gỉ", priceAdjustmentVND: 50000, stock: 100 },
        { name: "Bạc Ánh Kim / Dây Da Bò", option1: "Bạc Ánh Kim (Silver)", option2: "Dây Da Bò Cao Cấp", priceAdjustmentVND: 80000, stock: 100 }
      ]
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export class TemplatesController {
  // GET /api/v1/templates
  public async getTemplates(req: Request, res: Response): Promise<void> {
    try {
      const { category, search } = req.query;
      let filtered = [...templatesStore];

      if (category && typeof category === "string") {
        filtered = filtered.filter(t => t.categoryName.toLowerCase().includes(category.toLowerCase()));
      }

      if (search && typeof search === "string") {
        const query = search.toLowerCase();
        filtered = filtered.filter(t => 
          t.name.toLowerCase().includes(query) || 
          (t.description && t.description.toLowerCase().includes(query)) ||
          t.categoryName.toLowerCase().includes(query)
        );
      }

      res.json({
        success: true,
        total: filtered.length,
        templates: filtered
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // GET /api/v1/templates/:id
  public async getTemplateById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tpl = templatesStore.find(t => t.id === id);
      if (!tpl) {
        res.status(404).json({ success: false, error: "Template not found" });
        return;
      }
      res.json({ success: true, template: tpl });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // POST /api/v1/templates
  public async createTemplate(req: Request, res: Response): Promise<void> {
    try {
      const payload: Partial<ProductTemplate> = req.body;
      if (!payload.name || !payload.categoryName) {
        res.status(400).json({ success: false, error: "name and categoryName are required" });
        return;
      }

      const id = payload.id || `tpl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();

      if (payload.isDefault) {
        // Unset other defaults
        templatesStore.forEach(t => { t.isDefault = false; });
      }

      const newTemplate: ProductTemplate = {
        id,
        name: payload.name,
        description: payload.description || "",
        categoryName: payload.categoryName,
        targetPlatform: payload.targetPlatform || "ALL",
        isDefault: Boolean(payload.isDefault),
        content: payload.content || {},
        variation: payload.variation || { options: [] },
        createdAt: now,
        updatedAt: now
      };

      templatesStore.unshift(newTemplate);
      res.status(201).json({ success: true, template: newTemplate });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // PUT /api/v1/templates/:id
  public async updateTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const index = templatesStore.findIndex(t => t.id === id);
      if (index === -1) {
        res.status(404).json({ success: false, error: "Template not found" });
        return;
      }

      const payload: Partial<ProductTemplate> = req.body;
      if (payload.isDefault) {
        templatesStore.forEach(t => { t.isDefault = false; });
      }

      const existing = templatesStore[index];
      const updated: ProductTemplate = {
        ...existing,
        ...payload,
        id: existing.id, // preserve id
        updatedAt: new Date().toISOString()
      };

      templatesStore[index] = updated;
      res.json({ success: true, template: updated });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // DELETE /api/v1/templates/:id
  public async deleteTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const initialLength = templatesStore.length;
      templatesStore = templatesStore.filter(t => t.id !== id);

      if (templatesStore.length === initialLength) {
        res.status(404).json({ success: false, error: "Template not found" });
        return;
      }

      res.json({ success: true, message: "Template deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // POST /api/v1/templates/reset-defaults
  public async resetDefaults(req: Request, res: Response): Promise<void> {
    try {
      res.json({ success: true, total: templatesStore.length, templates: templatesStore });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

export const templatesController = new TemplatesController();
