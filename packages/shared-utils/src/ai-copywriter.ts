import { WebProduct, AICopywritingStyle } from "@hub1688/shared-types";

export interface GeneratedCopy {
  style: AICopywritingStyle;
  headline: string;
  bodyHtml: string;
  bodyText: string;
  callToAction: string;
}

const escapeHtml = (value: string): string => value
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

/**
 * Tạo bản nháp copy từ đúng các dữ liệu đã có trên sản phẩm.
 * Hàm không tự suy đoán vật liệu, ưu đãi, tồn kho, nguồn gốc hay chính sách.
 */
export const generateAICopywriting = generateMarketingCopy;

export function generateMarketingCopy(
  product: Partial<WebProduct>,
  style: AICopywritingStyle = "AIDA",
  language: "VI" | "EN" = "VI"
): GeneratedCopy {
  const title = language === "VI"
    ? (product.titleVI?.trim() || "Sản phẩm chưa đặt tên")
    : (product.titleEN?.trim() || product.titleVI?.trim() || "Untitled product");
  const materialAttribute = product.attributes?.find(attribute => {
    const key = `${attribute.keyVI || ""} ${attribute.keyEN || ""} ${attribute.keyCN || ""}`;
    return /chất liệu|material|材质|面料/i.test(key);
  });
  const material = language === "VI"
    ? (materialAttribute?.valueVI || materialAttribute?.valueEN || materialAttribute?.valueCN || "").trim()
    : (materialAttribute?.valueEN || materialAttribute?.valueVI || materialAttribute?.valueCN || "").trim();
  const price = Number(product.minPriceVND);
  const hasPrice = Number.isFinite(price) && price > 0;
  const priceLabel = hasPrice ? `${Math.round(price).toLocaleString("vi-VN")}đ` : "";
  const titleHtml = escapeHtml(title);

  if (language === "VI") {
    const materialLine = material
      ? `Chất liệu theo dữ liệu hiện có: ${material}.`
      : "Chất liệu: [Cần bổ sung từ nguồn đã xác minh].";
    const priceLine = hasPrice
      ? `Giá niêm yết hiện tại từ ${priceLabel}.`
      : "Giá bán: [Cần xác minh].";
    const factsHtml = `<ul><li>${escapeHtml(materialLine)}</li><li>${escapeHtml(priceLine)}</li><li>Vui lòng kiểm tra phân loại, tồn kho và chính sách cửa hàng trước khi đăng.</li></ul>`;

    switch (style) {
      case "PAS":
        return {
          style,
          headline: `Kiểm tra thông tin trước khi chọn ${title}`,
          bodyHtml: `<p><strong>Vấn đề</strong></p><p>Thông tin sản phẩm thiếu hoặc chưa đối chiếu có thể khiến người mua chọn sai phân loại.</p><p><strong>Giải pháp</strong></p><p>Đối chiếu dữ liệu của <strong>${titleHtml}</strong> trước khi đăng:</p>${factsHtml}`,
          bodyText: `Kiểm tra thông tin trước khi chọn ${title}. ${materialLine} ${priceLine} Đối chiếu phân loại, tồn kho và chính sách trước khi đăng.`,
          callToAction: "Xem thông tin và chọn phân loại"
        };
      case "SOCIAL_ADS":
        return {
          style,
          headline: `Thông tin nhanh: ${title}`,
          bodyHtml: `<p><strong>${titleHtml}</strong></p>${factsHtml}<p>Bản nháp này chỉ sử dụng dữ liệu hiện có; hãy hoàn thiện các mục còn thiếu trước khi chạy quảng cáo.</p>`,
          bodyText: `Thông tin nhanh: ${title}. ${materialLine} ${priceLine} Hoàn thiện dữ liệu còn thiếu trước khi quảng cáo.`,
          callToAction: "Xem chi tiết sản phẩm"
        };
      case "STORYTELLING":
        return {
          style,
          headline: `Câu chuyện của ${title} đang được hoàn thiện`,
          bodyHtml: `<p>Nội dung giới thiệu <strong>${titleHtml}</strong> đang ở trạng thái bản nháp.</p>${factsHtml}<p>Chỉ bổ sung câu chuyện về thiết kế, sản xuất hoặc nguồn gốc khi có tài liệu xác minh.</p>`,
          bodyText: `Nội dung giới thiệu ${title} đang ở trạng thái bản nháp. ${materialLine} ${priceLine}`,
          callToAction: "Tìm hiểu thông tin sản phẩm"
        };
      case "AIDA":
      default:
        return {
          style: "AIDA",
          headline: `Khám phá ${title}`,
          bodyHtml: `<p><strong>Thông tin chính</strong></p><p><strong>${titleHtml}</strong> đang được chuẩn bị nội dung bán hàng từ dữ liệu đã xác minh.</p>${factsHtml}<p>Hoàn thiện các trường còn thiếu để người mua có đủ thông tin trước khi quyết định.</p>`,
          bodyText: `Khám phá ${title}. ${materialLine} ${priceLine} Kiểm tra phân loại, tồn kho và chính sách trước khi đăng.`,
          callToAction: "Xem thông tin sản phẩm"
        };
    }
  }

  const materialLine = material
    ? `Material in the current product data: ${material}.`
    : "Material: [Verify and add from a trusted source].";
  const priceLine = hasPrice
    ? `Current listed price starts at ${priceLabel}.`
    : "Selling price: [Verify before publishing].";
  const factsHtml = `<ul><li>${escapeHtml(materialLine)}</li><li>${escapeHtml(priceLine)}</li><li>Verify variants, inventory, and store policies before publishing.</li></ul>`;

  switch (style) {
    case "PAS":
      return {
        style,
        headline: `Review the details before choosing ${title}`,
        bodyHtml: `<p><strong>Problem</strong></p><p>Incomplete product data can lead customers to choose the wrong variant.</p><p><strong>Solution</strong></p><p>Review the verified details for <strong>${titleHtml}</strong>:</p>${factsHtml}`,
        bodyText: `Review the details before choosing ${title}. ${materialLine} ${priceLine}`,
        callToAction: "View details and variants"
      };
    case "SOCIAL_ADS":
      return {
        style,
        headline: `Product snapshot: ${title}`,
        bodyHtml: `<p><strong>${titleHtml}</strong></p>${factsHtml}<p>This draft only uses current product data. Complete missing facts before advertising.</p>`,
        bodyText: `Product snapshot: ${title}. ${materialLine} ${priceLine}`,
        callToAction: "View product details"
      };
    case "STORYTELLING":
      return {
        style,
        headline: `The story of ${title} is being prepared`,
        bodyHtml: `<p>The introduction for <strong>${titleHtml}</strong> is still a draft.</p>${factsHtml}<p>Only add design, production, or origin stories when supporting information is available.</p>`,
        bodyText: `The introduction for ${title} is still a draft. ${materialLine} ${priceLine}`,
        callToAction: "Learn about the product"
      };
    case "AIDA":
    default:
      return {
        style: "AIDA",
        headline: `Discover ${title}`,
        bodyHtml: `<p><strong>Product information</strong></p><p><strong>${titleHtml}</strong> is being prepared from verified product data.</p>${factsHtml}<p>Complete missing fields so customers can make an informed choice.</p>`,
        bodyText: `Discover ${title}. ${materialLine} ${priceLine} Verify variants, inventory, and policies before publishing.`,
        callToAction: "View product information"
      };
  }
}
