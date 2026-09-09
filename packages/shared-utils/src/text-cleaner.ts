// Danh sách từ khóa rác phổ biến trên 1688 cần loại bỏ khỏi tiêu đề
export const JUNK_1688_KEYWORDS = [
  /202\d新款/g,
  /新款/g,
  /厂家直销/g,
  /源头厂家/g,
  /跨境专供/g,
  /跨境热销/g,
  /一件代发/g,
  /爆款/g,
  /1688/g,
  /淘货源/g,
  /热卖/g,
  /批发/g,
  /支持定制/g,
  /实力商家/g,
  /现货供应/g,
  /现货/g,
  /包邮/g,
  /正品/g,
  /特价/g,
  /清仓/g,
  /抖音同款/g,
  /快手同款/g,
  /小红书推荐/g,
  /ins风/g,
];

// Từ điển mặc định dịch các thuộc tính và kích thước
export const DEFAULT_GLOSSARY: Record<string, string> = {
  // Màu sắc phổ biến
  "黑色": "Đen",
  "白色": "Trắng",
  "灰色": "Xám",
  "粉色": "Hồng",
  "红色": "Đỏ",
  "黄色": "Vàng",
  "蓝色": "Xanh dương",
  "绿色": "Xanh lá",
  "卡其色": "Be / Khaki",
  "米白色": "Trắng kem",
  "藏青色": "Xanh than",
  "酒红色": "Đỏ đô",
  "紫色": "Tím",
  "咖啡色": "Nâu cà phê",

  // Kích thước & Thuộc tính
  "均码": "Freesize",
  "加绒": "Lót nỉ",
  "不加绒": "Không nỉ",
  "纯棉": "Cotton",
  "高腰": "Cạp cao",
  "低腰": "Cạp thấp",
  "速干": "Nhanh khô",
  "防滑": "Chống trượt",
  "透气": "Thoáng khí",
  "弹力": "Co giãn",
  "无缝": "Seamless (Không đường may)",
  "瑜伽裤": "Quần Legging Nữ",
  "运动内衣": "Áo Bra Thể Thao",
  "短袖T恤": "Áo Thun Ngắn Tay",
  "连衣裙": "Váy Liền Thân",
  "阔腿裤": "Quần Ống Rộng",
  "马丁靴": "Giày Boots Martin",
  "帆布鞋": "Giày Canvas",
  "双肩包": "Balo",
  "单肩包": "Túi Đeo Chéo"
};

/**
 * Loại bỏ từ khóa rác của 1688 và làm sạch khoảng trắng
 */
export function clean1688Title(rawTitle: string): string {
  if (!rawTitle) return "";
  let cleaned = rawTitle;
  for (const pattern of JUNK_1688_KEYWORDS) {
    cleaned = cleaned.replace(pattern, " ");
  }
  // Loại bỏ ký tự đặc biệt thừa thãi: 【 】, （ ）, v.v.
  cleaned = cleaned.replace(/[【】\[\]（）()★☆▲▼]/g, " ");
  return cleaned.replace(/\s+/g, " ").trim();
}

/**
 * Tra từ điển thay thế chính xác các cụm từ
 */
export function applyGlossary(
  text: string,
  customGlossary: Record<string, string> = {}
): string {
  if (!text) return "";
  const merged = { ...DEFAULT_GLOSSARY, ...customGlossary };
  let result = text;
  
  // Sắp xếp các từ khóa dài trước để tránh bị nuốt chữ
  const keys = Object.keys(merged).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (result.includes(key)) {
      result = result.split(key).join(merged[key]);
    }
  }
  return result;
}

/**
 * Chuẩn hóa size: Nếu là chữ cái kích thước quốc tế (S, M, L, XL, 2XL, 3XL...) thì giữ nguyên tuyệt đối
 */
export function normalizeSizeProp(sizeStr: string): string {
  const trimmed = sizeStr.trim().toUpperCase();
  const standardSizes = ["XS", "S", "M", "L", "XL", "2XL", "XXL", "3XL", "XXXL", "4XL", "5XL", "FS", "FREESIZE"];
  if (standardSizes.includes(trimmed)) {
    return trimmed;
  }
  if (trimmed === "均码") return "Freesize";
  return sizeStr.trim();
}
