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

// Từ điển mặc định dịch các thuộc tính sang Tiếng Việt
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
  "杏色": "Màu Be Hạnh Nhân",
  "浅蓝色": "Xanh nhạt",
  "军绿色": "Xanh quân đội",

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
  "无缝": "Seamless",
  "瑜伽裤": "Quần Legging Nữ",
  "运动内衣": "Áo Bra Thể Thao",
  "短袖T恤": "Áo Thun Ngắn Tay",
  "连衣裙": "Váy Liền Thân",
  "阔腿裤": "Quần Ống Rộng",
  "马丁靴": "Giày Boots Martin",
  "帆布鞋": "Giày Canvas",
  "双肩包": "Balo",
  "单肩包": "Túi Đeo Chéo",
  "衬衫": "Áo Sơ Mi",
  "卫衣": "Áo Hoodie",
  "短裤": "Quần Short",
  "西装": "Áo Blazer",
  "聚酯纤维": "Polyester",
  "雪纺": "Vải Voan Chiffon",
  "亚麻": "Vải Linen",
  "真丝": "Lụa Tơ Tằm",

  // Bộ sản phẩm, Combo, Quy cách & Biến thể tùy chỉnh (Var Custom)
  "套装": "Bộ sản phẩm",
  "两件套": "Bộ 2 món",
  "三件套": "Bộ 3 món",
  "四件套": "Bộ 4 món",
  "五件套": "Bộ 5 món",
  "六件套": "Bộ 6 món",
  "七件套": "Bộ 7 món",
  "八件套": "Bộ 8 món",
  "九件套": "Bộ 9 món",
  "十件套": "Bộ 10 món",
  "十二件套": "Bộ 12 món",
  "件套": "Món / Chi tiết",
  "组合": "Combo",
  "套餐": "Combo / Gói",
  "套餐一": "Gói 1",
  "套餐二": "Gói 2",
  "套餐三": "Gói 3",
  "规格": "Quy cách",
  "款式": "Kiểu dáng",
  "型号": "Model",
  "容量": "Dung tích",
  "尺寸": "Kích thước",
  "包装": "Quy cách đóng gói",
  "包装规格": "Quy cách đóng gói",
  "标准版": "Bản tiêu chuẩn",
  "升级版": "Bản nâng cấp",
  "豪华版": "Bản cao cấp",
  "旗舰版": "Bản cao cấp nhất",
  "基础版": "Bản cơ bản",
  "基础款": "Mẫu cơ bản",
  "单件": "Đơn chiếc",
  "整套": "Nguyên bộ",
  "礼盒装": "Hộp quà tặng",
  "盒装": "Hộp",
  "袋装": "Túi",
  "瓶装": "Chai",
  "罐装": "Hũ / Lon",
  "支装": "Cây / Chiếc",
  "带盖": "Kèm nắp",
  "不带盖": "Không nắp",
  "带收纳盒": "Kèm hộp đựng",
  "含赠品": "Kèm quà tặng",
  "无赠品": "Không quà tặng",
  "加长": "Dài hơn",
  "定制": "Tùy chỉnh (Custom)",
  "定制款": "Mẫu tùy chỉnh",
  "来图定制": "Tùy chỉnh theo yêu cầu",
  "自定义": "Tùy chỉnh",
  "颜色分类": "Phân loại",
  "尺码/规格": "Kích thước / Quy cách"
};

// Từ điển dịch sang Tiếng Anh chuẩn E-commerce (Shopify / Amazon)
export const DEFAULT_GLOSSARY_EN: Record<string, string> = {
  // Colors
  "黑色": "Black",
  "白色": "White",
  "灰色": "Grey",
  "粉色": "Pink",
  "红色": "Red",
  "黄色": "Yellow",
  "蓝色": "Blue",
  "绿色": "Green",
  "卡其色": "Khaki",
  "米白色": "Off-White",
  "藏青色": "Navy Blue",
  "酒红色": "Burgundy",
  "紫色": "Purple",
  "咖啡色": "Coffee Brown",
  "杏色": "Apricot",
  "浅蓝色": "Light Blue",
  "军绿色": "Army Green",

  // Attributes & Specs
  "均码": "One Size",
  "加绒": "Fleece Lined",
  "不加绒": "Standard (Unlined)",
  "纯棉": "100% Cotton",
  "高腰": "High Waist",
  "低腰": "Low Rise",
  "速干": "Quick Dry",
  "防滑": "Anti-Slip",
  "透气": "Breathable",
  "弹力": "Elastic / Stretchy",
  "无缝": "Seamless",
  "瑜伽裤": "Yoga Leggings",
  "运动内衣": "Sports Bra",
  "短袖T恤": "Short Sleeve T-Shirt",
  "连衣裙": "Dress",
  "阔腿裤": "Wide Leg Pants",
  "马丁靴": "Martin Boots",
  "帆布鞋": "Canvas Sneakers",
  "双肩包": "Backpack",
  "单肩包": "Shoulder Bag",
  "衬衫": "Shirt / Blouse",
  "卫衣": "Hoodie",
  "短裤": "Shorts",
  "西装": "Blazer Suit",
  "聚酯纤维": "Polyester",
  "雪纺": "Chiffon",
  "亚麻": "Linen",
  "真丝": "Mulberry Silk",
  "材质": "Material",
  "面料": "Fabric",
  "产地": "Origin",
  "货号": "Item No.",
  "尺码": "Size",
  "尺寸": "Dimensions",
  "颜色": "Color",

  // Bundles, Sets, Specs & Custom Variants
  "套装": "Set",
  "两件套": "2-Piece Set",
  "三件套": "3-Piece Set",
  "四件套": "4-Piece Set",
  "五件套": "5-Piece Set",
  "六件套": "6-Piece Set",
  "七件套": "7-Piece Set",
  "八件套": "8-Piece Set",
  "九件套": "9-Piece Set",
  "十件套": "10-Piece Set",
  "十二件套": "12-Piece Set",
  "件套": "Piece Set",
  "组合": "Combo",
  "套餐": "Bundle",
  "规格": "Specification",
  "款式": "Style",
  "型号": "Model",
  "容量": "Capacity",
  "标准版": "Standard Edition",
  "升级版": "Upgraded Edition",
  "豪华版": "Deluxe Edition",
  "旗舰版": "Flagship Edition",
  "基础版": "Basic Edition",
  "单件": "Single Piece",
  "整套": "Full Set",
  "礼盒装": "Gift Box",
  "盒装": "Boxed",
  "袋装": "Bagged",
  "瓶装": "Bottled",
  "带收纳盒": "With Storage Box",
  "定制": "Custom",
  "定制款": "Custom Edition",
  "自定义": "Custom"
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
 * Tra từ điển thay thế chính xác các cụm từ sang Tiếng Việt
 */
export function applyGlossary(
  text: string,
  customGlossary: Record<string, string> = {}
): string {
  if (!text) return "";
  const merged = { ...DEFAULT_GLOSSARY, ...customGlossary };
  let result = text;
  
  // 1. Dịch mẫu số lượng động cho Bộ sản phẩm, Combo, Quy cách đóng gói (vd: 3件套 -> Bộ 3 món)
  result = result.replace(/(\d+)\s*件套/g, "Bộ $1 món");
  result = result.replace(/(\d+)\s*个装/g, "Hộp $1 chiếc");
  result = result.replace(/(\d+)\s*支装/g, "Hộp $1 cây");
  result = result.replace(/(\d+)\s*只装/g, "Hộp $1 chiếc");
  result = result.replace(/(\d+)\s*双装/g, "Set $1 đôi");
  result = result.replace(/(\d+)\s*条装/g, "Set $1 chiếc");
  result = result.replace(/(\d+)\s*本装/g, "Set $1 cuốn");
  result = result.replace(/(\d+)\s*包装/g, "Set $1 gói");
  result = result.replace(/(\d+)\s*瓶装/g, "Lốc $1 chai");
  result = result.replace(/(\d+)\s*盒装/g, "Set $1 hộp");
  result = result.replace(/(\d+)\s*件/g, "$1 món");

  // 2. Sắp xếp các từ khóa dài trước để tránh bị nuốt chữ
  const keys = Object.keys(merged).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (result.includes(key)) {
      result = result.split(key).join(merged[key]);
    }
  }
  return result;
}

/**
 * Tra từ điển thay thế chính xác các cụm từ sang Tiếng Anh
 */
export function applyGlossaryEN(
  text: string,
  customGlossary: Record<string, string> = {}
): string {
  if (!text) return "";
  const merged = { ...DEFAULT_GLOSSARY_EN, ...customGlossary };
  let result = text;
  
  result = result.replace(/(\d+)\s*件套/g, "$1-Piece Set");
  result = result.replace(/(\d+)\s*个装/g, "Pack of $1");
  result = result.replace(/(\d+)\s*支装/g, "Pack of $1");
  result = result.replace(/(\d+)\s*双装/g, "$1 Pairs Set");
  result = result.replace(/(\d+)\s*包装/g, "Pack of $1");

  const keys = Object.keys(merged).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (result.includes(key)) {
      result = result.split(key).join(" " + merged[key] + " ");
    }
  }
  return result.replace(/\s+/g, " ").trim();
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
