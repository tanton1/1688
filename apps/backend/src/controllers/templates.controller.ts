import { Request, Response } from "express";
import { ProductTemplate } from "@hub1688/shared-types";
import { supabaseService } from "../services/supabase.service.js";
import crypto from "node:crypto";

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
      titlePrefix: "[Cá Nhân Hóa]",
      titleSuffix: "- Tùy Chỉnh Theo Yêu Cầu",
      titleFormula: "{prefix} {title} {suffix}",
      shortDescVI: "Sản phẩm có trường tùy chỉnh tên hoặc thông điệp. Cần xác minh vật liệu, kỹ thuật hoàn thiện và thời gian sản xuất trước khi đăng bán.",
      shortDescEN: "Product draft with name or message customization fields. Verify materials, finish, and production time before publishing.",
      fullDescVI: `### THÔNG TIN CÁ NHÂN HÓA
- Nội dung tùy chỉnh: [Cần xác minh]
- Kích thước: [Cần xác minh]
- Chất liệu: [Cần xác minh]
- Thời gian hoàn thiện: [Cần xác minh]

### LƯU Ý DUYỆT NỘI DUNG
Chỉ công bố mockup, chính sách bảo hành và thời gian giao hàng sau khi cửa hàng đã xác nhận quy trình thực tế.`,
      attributes: [],
      warrantyPolicy: "",
      shippingPolicy: "",
      focusKeywords: ["quà tặng cá nhân hóa", "quà tặng in tên", "quà tặng độc đáo", "personalized gift"],
      faqs: []
    },
    variation: {
      options: [
        { name: "Kích thước (Size)", values: ["Size Vừa (7x9 inch)", "Size Lớn (9x10 inch)"] },
        { name: "Combo / Đóng gói", values: ["1 PCS (Đơn)", "Combo 2 PCS", "Combo 4 PCS", "Combo 6 PCS"] }
      ],
      defaultStock: 0,
      skuPattern: "{SKU}-{SIZE}-{COMBO}",
      predefinedVariants: [
        { name: "Size Vừa (7x9 inch) / 1 PCS (Đơn)", option1: "Size Vừa (7x9 inch)", option2: "1 PCS (Đơn)", priceAdjustmentVND: 0, stock: 0 },
        { name: "Size Vừa (7x9 inch) / Combo 2 PCS", option1: "Size Vừa (7x9 inch)", option2: "Combo 2 PCS", priceAdjustmentVND: 0, stock: 0 },
        { name: "Size Vừa (7x9 inch) / Combo 4 PCS", option1: "Size Vừa (7x9 inch)", option2: "Combo 4 PCS", priceAdjustmentVND: 0, stock: 0 },
        { name: "Size Vừa (7x9 inch) / Combo 6 PCS", option1: "Size Vừa (7x9 inch)", option2: "Combo 6 PCS", priceAdjustmentVND: 0, stock: 0 },
        { name: "Size Lớn (9x10 inch) / 1 PCS (Đơn)", option1: "Size Lớn (9x10 inch)", option2: "1 PCS (Đơn)", priceAdjustmentVND: 0, stock: 0 },
        { name: "Size Lớn (9x10 inch) / Combo 2 PCS", option1: "Size Lớn (9x10 inch)", option2: "Combo 2 PCS", priceAdjustmentVND: 0, stock: 0 },
        { name: "Size Lớn (9x10 inch) / Combo 4 PCS", option1: "Size Lớn (9x10 inch)", option2: "Combo 4 PCS", priceAdjustmentVND: 0, stock: 0 },
        { name: "Size Lớn (9x10 inch) / Combo 6 PCS", option1: "Size Lớn (9x10 inch)", option2: "Combo 6 PCS", priceAdjustmentVND: 0, stock: 0 }
      ]
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "tpl-fashion-unisex",
    name: "Khung Thời Trang Unisex",
    description: "Khung phân loại quần áo unisex; số đo, chất liệu và màu sắc cần được xác minh theo sản phẩm",
    categoryName: "Thời Trang & May Mặc",
    targetPlatform: "ALL",
    isDefault: false,
    content: {
      titlePrefix: "[Unisex]",
      titleSuffix: "",
      titleFormula: "{prefix} {title} {suffix}",
      shortDescVI: "Khung nội dung thời trang unisex. Cần bổ sung chất liệu, số đo và hướng dẫn bảo quản từ dữ liệu đã xác minh.",
      fullDescVI: `### THÔNG TIN SẢN PHẨM
- Chất liệu: [Cần xác minh]
- Kiểu dáng: [Cần xác minh]
- Kỹ thuật in/thêu: [Cần xác minh]

### BẢNG KÍCH THƯỚC
Đối chiếu và điền số đo thực tế cho từng phân loại trước khi đăng bán.

### HƯỚNG DẪN BẢO QUẢN
Chỉ sử dụng hướng dẫn do nhà sản xuất cung cấp.`,
      attributes: [],
      warrantyPolicy: "",
      shippingPolicy: "",
      focusKeywords: ["áo thun unisex", "áo phông form rộng", "áo oversize cotton", "thời trang streetwear"]
    },
    variation: {
      options: [
        { name: "Kích thước (Size)", values: ["Size S", "Size M", "Size L", "Size XL", "Size 2XL"] },
        { name: "Màu sắc (Color)", values: ["Đen Basic", "Trắng Tinh Khôi", "Xám Khói", "Nâu Be Vintage"] }
      ],
      defaultStock: 0,
      skuPattern: "{SKU}-{SIZE}-{COLOR}",
      predefinedVariants: [
        { name: "Size S / Đen Basic", option1: "Size S", option2: "Đen Basic", priceAdjustmentVND: 0, stock: 0 },
        { name: "Size M / Đen Basic", option1: "Size M", option2: "Đen Basic", priceAdjustmentVND: 0, stock: 0 },
        { name: "Size L / Đen Basic", option1: "Size L", option2: "Đen Basic", priceAdjustmentVND: 0, stock: 0 },
        { name: "Size XL / Đen Basic", option1: "Size XL", option2: "Đen Basic", priceAdjustmentVND: 0, stock: 0 },
        { name: "Size 2XL / Đen Basic", option1: "Size 2XL", option2: "Đen Basic", priceAdjustmentVND: 0, stock: 0 },
        { name: "Size S / Trắng Tinh Khôi", option1: "Size S", option2: "Trắng Tinh Khôi", priceAdjustmentVND: 0, stock: 0 },
        { name: "Size M / Trắng Tinh Khôi", option1: "Size M", option2: "Trắng Tinh Khôi", priceAdjustmentVND: 0, stock: 0 },
        { name: "Size L / Trắng Tinh Khôi", option1: "Size L", option2: "Trắng Tinh Khôi", priceAdjustmentVND: 0, stock: 0 },
        { name: "Size XL / Trắng Tinh Khôi", option1: "Size XL", option2: "Trắng Tinh Khôi", priceAdjustmentVND: 0, stock: 0 },
        { name: "Size 2XL / Trắng Tinh Khôi", option1: "Size 2XL", option2: "Trắng Tinh Khôi", priceAdjustmentVND: 0, stock: 0 }
      ]
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "tpl-smart-home",
    name: "Đồ Gia Dụng Thông Minh & Đời Sống",
    description: "Khung nội dung gia dụng; thông số điện, vật liệu và bảo hành cần xác minh theo sản phẩm",
    categoryName: "Gia Dụng & Đời Sống",
    targetPlatform: "ALL",
    isDefault: false,
    content: {
      titlePrefix: "[Gia Dụng]",
      titleSuffix: "",
      titleFormula: "{prefix} {title} {suffix}",
      shortDescVI: "Khung nội dung sản phẩm gia dụng. Cần bổ sung công dụng, thông số an toàn và điều kiện bảo hành đã được xác minh.",
      fullDescVI: `### THÔNG TIN SẢN PHẨM
- Công dụng: [Cần xác minh]
- Điện áp và công suất: [Cần xác minh]
- Vật liệu: [Cần xác minh]
- Phụ kiện đi kèm: [Cần xác minh]

### AN TOÀN VÀ BẢO HÀNH
Chỉ công bố hướng dẫn an toàn và chính sách bảo hành từ tài liệu chính thức.`,
      attributes: [],
      warrantyPolicy: "",
      shippingPolicy: "",
      focusKeywords: ["gia dụng thông minh", "thiết bị gia đình", "đồ dùng nhà bếp tiện ích"]
    },
    variation: {
      options: [
        { name: "Phiên bản (Model)", values: ["Bản Tiêu Chuẩn", "Bản Nâng Cấp (Kèm Phụ Kiện)", "Bản Cao Cấp Full Box"] }
      ],
      defaultStock: 0,
      skuPattern: "{SKU}-{MODEL}",
      predefinedVariants: [
        { name: "Bản Tiêu Chuẩn", option1: "Bản Tiêu Chuẩn", priceAdjustmentVND: 0, stock: 0 },
        { name: "Bản Nâng Cấp (Kèm Phụ Kiện)", option1: "Bản Nâng Cấp (Kèm Phụ Kiện)", priceAdjustmentVND: 0, stock: 0 },
        { name: "Bản Cao Cấp Full Box", option1: "Bản Cao Cấp Full Box", priceAdjustmentVND: 0, stock: 0 }
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
      titlePrefix: "[Phụ Kiện Công Nghệ]",
      titleSuffix: "",
      titleFormula: "{prefix} {title} {suffix}",
      shortDescVI: "Khung nội dung phụ kiện công nghệ. Cần xác minh thiết bị tương thích, tiêu chuẩn bảo vệ và vật liệu trước khi đăng bán.",
      fullDescVI: `### THÔNG TIN KỸ THUẬT
- Thiết bị tương thích: [Cần xác minh]
- Tiêu chuẩn chống nước/bụi: [Cần xác minh]
- Vật liệu hoàn thiện: [Cần xác minh]
- Phụ kiện đi kèm: [Cần xác minh]

### LƯU Ý
Không tự suy đoán chứng nhận, khả năng chống nước hoặc thời hạn bảo hành.`,
      attributes: [],
      warrantyPolicy: "",
      shippingPolicy: "",
      focusKeywords: ["phụ kiện công nghệ", "smartwatch"]
    },
    variation: {
      options: [
        { name: "Màu khung máy", values: ["Đen Nhám (Space Black)", "Bạc Ánh Kim (Silver)", "Vàng Hồng (Rose Gold)"] },
        { name: "Loại Dây Đeo", values: ["Dây Silicon Thể Thao", "Dây Thép Milanese Chống Gỉ", "Dây Da Bò Cao Cấp"] }
      ],
      defaultStock: 0,
      skuPattern: "{SKU}-{COLOR}-{STRAP}",
      predefinedVariants: [
        { name: "Đen Nhám / Dây Silicon", option1: "Đen Nhám (Space Black)", option2: "Dây Silicon Thể Thao", priceAdjustmentVND: 0, stock: 0 },
        { name: "Đen Nhám / Dây Thép Milanese", option1: "Đen Nhám (Space Black)", option2: "Dây Thép Milanese Chống Gỉ", priceAdjustmentVND: 0, stock: 0 },
        { name: "Đen Nhám / Dây Da Bò", option1: "Đen Nhám (Space Black)", option2: "Dây Da Bò Cao Cấp", priceAdjustmentVND: 0, stock: 0 },
        { name: "Bạc Ánh Kim / Dây Silicon", option1: "Bạc Ánh Kim (Silver)", option2: "Dây Silicon Thể Thao", priceAdjustmentVND: 0, stock: 0 },
        { name: "Bạc Ánh Kim / Dây Thép Milanese", option1: "Bạc Ánh Kim (Silver)", option2: "Dây Thép Milanese Chống Gỉ", priceAdjustmentVND: 0, stock: 0 },
        { name: "Bạc Ánh Kim / Dây Da Bò", option1: "Bạc Ánh Kim (Silver)", option2: "Dây Da Bò Cao Cấp", priceAdjustmentVND: 0, stock: 0 }
      ]
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const DEFAULT_TEMPLATES: ProductTemplate[] = JSON.parse(JSON.stringify(templatesStore));

const normalizeTemplateVariation = (variation: ProductTemplate["variation"]): ProductTemplate["variation"] => ({
  ...variation,
  defaultStock: 0,
  predefinedVariants: variation.predefinedVariants?.map(variant => ({ ...variant, stock: 0 }))
});

export class TemplatesController {
  // GET /api/v1/templates
  public async getTemplates(req: Request, res: Response): Promise<void> {
    try {
      if (supabaseService.isConfigured()) {
        const persisted = await supabaseService.getTemplates();
        if (persisted === null) throw new Error("PERSISTENCE_FAILED");
        if (persisted.length) templatesStore = persisted;
        else {
          if (!(await supabaseService.replaceTemplates(DEFAULT_TEMPLATES))) throw new Error("PERSISTENCE_FAILED");
          templatesStore = JSON.parse(JSON.stringify(DEFAULT_TEMPLATES));
        }
      }
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
      if (supabaseService.isConfigured()) {
        const persisted = await supabaseService.getTemplates();
        if (persisted) templatesStore = persisted;
      }
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

      const id = payload.id || `tpl-${crypto.randomUUID()}`;
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
        variation: normalizeTemplateVariation(payload.variation || { options: [] }),
        createdAt: now,
        updatedAt: now
      };

      if (supabaseService.isConfigured()) {
        if (payload.isDefault) {
          for (const template of templatesStore) if (!(await supabaseService.saveTemplate(template))) throw new Error("PERSISTENCE_FAILED");
        }
        if (!(await supabaseService.saveTemplate(newTemplate))) throw new Error("PERSISTENCE_FAILED");
      }
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
        ...(payload.variation ? { variation: normalizeTemplateVariation(payload.variation) } : {}),
        id: existing.id, // preserve id
        createdAt: existing.createdAt,
        updatedAt: new Date().toISOString()
      };

      if (supabaseService.isConfigured()) {
        if (payload.isDefault) {
          for (const template of templatesStore) if (!(await supabaseService.saveTemplate(template))) throw new Error("PERSISTENCE_FAILED");
        }
        if (!(await supabaseService.saveTemplate(updated))) throw new Error("PERSISTENCE_FAILED");
      }
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
      if (!templatesStore.some(template => template.id === id)) {
        res.status(404).json({ success: false, error: "Template not found" });
        return;
      }
      if (supabaseService.isConfigured() && !(await supabaseService.deleteTemplate(id))) throw new Error("PERSISTENCE_FAILED");
      templatesStore = templatesStore.filter(t => t.id !== id);

      res.json({ success: true, message: "Template deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // POST /api/v1/templates/reset-defaults
  public async resetDefaults(req: Request, res: Response): Promise<void> {
    try {
      const now = new Date().toISOString();
      templatesStore = DEFAULT_TEMPLATES.map(template => ({ ...JSON.parse(JSON.stringify(template)), createdAt: now, updatedAt: now }));
      if (supabaseService.isConfigured() && !(await supabaseService.replaceTemplates(templatesStore))) throw new Error("PERSISTENCE_FAILED");
      res.json({ success: true, total: templatesStore.length, templates: templatesStore });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

export const templatesController = new TemplatesController();
