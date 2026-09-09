import {
  ProductTitleVariants,
  TranslationMode,
  Raw1688Attribute
} from "@hub1688/shared-types";
import {
  clean1688Title,
  applyGlossary,
  DEFAULT_GLOSSARY,
  normalizeSizeProp
} from "@hub1688/shared-utils";
import { ENV } from "../config/env.js";

export class TranslationEngineService {
  private customGlossary: Record<string, string> = {};

  constructor(customGlossary: Record<string, string> = {}) {
    this.customGlossary = customGlossary;
  }

  public updateGlossary(glossary: Record<string, string>) {
    this.customGlossary = { ...this.customGlossary, ...glossary };
  }

  /**
   * Sinh 4 kiểu tiêu đề sản phẩm (Original, Literal, Clean, SEO, Display)
   */
  public generateTitleVariants(rawTitleCN: string, category: string = "Thời trang"): ProductTitleVariants {
    const cleanedCN = clean1688Title(rawTitleCN);
    const translatedLiteral = applyGlossary(cleanedCN, this.customGlossary);

    // Xây dựng tiêu đề Clean
    const cleanTitle = this.formatEcommerceTitle(translatedLiteral);

    // Xây dựng tiêu đề SEO (kèm từ khóa tìm kiếm & danh mục)
    const seoTitle = `${cleanTitle} – Cao Cấp, Bền Đẹp, Chuẩn Form`;

    // Xây dựng tiêu đề Display thương mại
    const displayTitle = `${cleanTitle} (Mẫu Mới)`;

    return {
      original: rawTitleCN,
      literal: translatedLiteral,
      clean: cleanTitle,
      seo: seoTitle,
      display: displayTitle
    };
  }

  /**
   * Dịch thuộc tính sản phẩm và loại bỏ thuộc tính không cần thiết
   */
  public translateAttributes(attrs: Raw1688Attribute[]): Array<{ keyVI: string; valueVI: string; keyCN: string; valueCN: string }> {
    return attrs.map(attr => {
      let keyVI = applyGlossary(attr.nameCN, this.customGlossary);
      if (attr.nameCN.includes("颜色")) keyVI = "Màu sắc";
      if (attr.nameCN.includes("尺码") || attr.nameCN.includes("尺寸")) keyVI = "Kích thước";
      if (attr.nameCN.includes("材质") || attr.nameCN.includes("面料")) keyVI = "Chất liệu";
      if (attr.nameCN.includes("货号")) keyVI = "Mã sản phẩm";
      if (attr.nameCN.includes("产地")) keyVI = "Xuất xứ";

      let valueVI = applyGlossary(attr.valueCN, this.customGlossary);
      valueVI = normalizeSizeProp(valueVI);

      return {
        keyCN: attr.nameCN,
        valueCN: attr.valueCN,
        keyVI,
        valueVI
      };
    });
  }

  /**
   * Tái cấu trúc mô tả sản phẩm thành 5-7 phần chuẩn E-commerce
   */
  public generateStructuredDescription(
    titleVI: string,
    attributes: Array<{ keyVI: string; valueVI: string }>,
    rawDescText: string = ""
  ): string {
    const materialAttr = attributes.find(a => a.keyVI === "Chất liệu")?.valueVI || "Vải cao cấp thoáng khí";
    const originAttr = attributes.find(a => a.keyVI === "Xuất xứ")?.valueVI || "Nội địa cao cấp";

    return `
### GIỚI THIỆU SẢN PHẨM
${titleVI} được sản xuất với tiêu chuẩn chất lượng cao, phong cách hiện đại, thanh lịch và phù hợp sử dụng hàng ngày hoặc tập luyện thể thao.

### ĐẶC ĐIỂM NỔI BẬT
• Thiết kế tôn dáng, đường may tỉ mỉ, chắc chắn từng chi tiết.
• Vải mềm mại, co giãn đàn hồi và thoáng mát vượt trội.
• Khả năng thấm hút mồ hôi và nhanh khô, không xù lông hay phai màu sau nhiều lần giặt.
• Form chuẩn, mang lại cảm giác thoải mái suốt ngày dài.

### THÔNG SỐ & CHẤT LIỆU
• **Chất liệu**: ${materialAttr}
• **Xuất xứ**: ${originAttr}
• **Quy cách đóng gói**: Túi zip bảo quản chuyên dụng

### HƯỚNG DẪN CHỌN SIZE
• Vui lòng tham khảo bảng kích thước chi tiết hoặc nhắn tin cho shop để được tư vấn size chuẩn nhất.

### HƯỚNG DẪN BẢO QUẢN
• Giặt ở nhiệt độ thường với đồ có màu tương tự.
• Không sử dụng hóa chất tẩy mạnh.
• Phơi ở nơi thoáng gió, tránh ánh nắng gay gắt trực tiếp.
    `.trim();
  }

  private formatEcommerceTitle(text: string): string {
    // Chuyển chữ cái đầu các từ thành chữ hoa thẩm mỹ
    return text
      .split(" ")
      .filter(Boolean)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }
}
