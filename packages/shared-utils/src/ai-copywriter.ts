import { WebProduct, AICopywritingStyle } from "@hub1688/shared-types";

export interface GeneratedCopy {
  style: AICopywritingStyle;
  headline: string;
  bodyHtml: string;
  bodyText: string;
  callToAction: string;
}

/**
 * Động cơ AI Copywriter chuyên biệt cho E-Commerce & Thời trang
 */
export const generateAICopywriting = generateMarketingCopy;

export function generateMarketingCopy(
  product: Partial<WebProduct>,
  style: AICopywritingStyle = "AIDA",
  language: "VI" | "EN" = "VI"
): GeneratedCopy {
  const title = language === "VI" ? (product.titleVI || "Sản phẩm thời trang") : (product.titleEN || product.titleVI || "Fashion Product");
  const material = product.attributes?.find(a => language === "VI" ? a.keyVI === "Chất liệu" : a.keyEN === "Material")?.valueVI || "vải cao cấp thoáng khí";
  const minPrice = (product.minPriceVND || 0).toLocaleString("vi-VN");

  if (language === "VI") {
    switch (style) {
      case "AIDA":
        return {
          style: "AIDA",
          headline: `🔥 ĐỪNG BỎ LỠ: ${title} – CHUẨN GU NÀNG THƠ 2026!`,
          bodyHtml: `
<p><strong>[ATTENTION - GÂY CHÚ Ý]</strong></p>
<p>Bạn đang tìm kiếm một set đồ vừa tôn dáng thanh lịch, vừa thoải mái diện suốt cả ngày từ văn phòng đến những buổi dạo phố cuối tuần?</p>

<p><strong>[INTEREST - KHƠI GỢI THÍCH THÚ]</strong></p>
<p>🌟 <strong>${title}</strong> được may từ <em>${material}</em> mềm mại, thông thoáng và có độ rũ tự nhiên tuyệt đối. Từng đường kim mũi chỉ được xưởng may gia công tỉ mỉ theo phom dáng chuẩn người Á Đông.</p>

<p><strong>[DESIRE - KHAO KHÁT SỞ HỮU]</strong></p>
<ul>
  <li>✨ Tôn trọn nét nữ tính thanh lịch, giấu khuyết điểm vòng 2 cực khéo léo.</li>
  <li>✨ Dễ dàng mix & match cùng giày cao gót, túi xách hay giày sneaker năng động.</li>
  <li>✨ Chất liệu bền màu, không bai dão hay xù lông sau nhiều lần giặt.</li>
</ul>

<p><strong>[ACTION - HÀNH ĐỘNG NGAY]</strong></p>
<p>👉 Ưu đãi giá sỉ chỉ từ <strong>${minPrice}đ</strong> trong tuần này. Số lượng có hạn, nhanh tay sở hữu ngay hôm nay!</p>
          `.trim(),
          bodyText: `ĐỪNG BỎ LỠ: ${title}\nChất liệu ${material} cao cấp, tôn dáng cực khéo. Ưu đãi giá từ ${minPrice}đ. Đặt hàng ngay hôm nay!`,
          callToAction: "MUA NGAY - ƯU ĐÃI CÓ HẠN"
        };

      case "PAS":
        return {
          style: "PAS",
          headline: `⚠️ NỖI LO MUA ĐỒ ONLINE: FORM XẤU, VẢI BÍ BÁCH VÀ DỄ XÙ LÔNG?`,
          bodyHtml: `
<p><strong>[PROBLEM - NỖI ĐAU]</strong></p>
<p>Bao nhiêu lần bạn hí hửng đặt đồ trên mạng nhưng khi nhận về lại thất vọng vì vải mỏng tang, bí bách, giặt một nước đã phai màu và nhăn nhúm?</p>

<p><strong>[AGITATE - XOÁY SÂU VÀO NỖI LO]</strong></p>
<p>Mặc một bộ đồ không đứng dáng không chỉ khiến bạn thiếu tự tin khi gặp bạn bè, đồng nghiệp mà còn lãng phí tiền bạc vào những món đồ chỉ mặc được đúng 1 lần.</p>

<p><strong>[SOLUTION - GIẢI PHÁP VƯỢT TRỘI]</strong></p>
<p>✨ Hãy để <strong>${title}</strong> thay đổi hoàn toàn trải nghiệm của bạn! Được chọn lọc trực tiếp từ xưởng may cao cấp với chất liệu <strong>${material}</strong> chuẩn xịn:</p>
<ul>
  <li>✔ Giữ form chuẩn đét, tôn trọn vóc dáng thanh mảnh.</li>
  <li>✔ Thấm hút mồ hôi vượt trội, mặc mát lạnh êm ái cả ngày.</li>
  <li>✔ Cam kết giống ảnh 100%, hỗ trợ kiểm tra hàng trước khi thanh toán.</li>
</ul>
          `.trim(),
          bodyText: `Tạm biệt nỗi lo đồ online kém chất lượng. ${title} cam kết vải ${material} chuẩn xịn, form dáng hoàn hảo!`,
          callToAction: "ĐẶT HÀNG TRẢI NGHIỆM CHẤT LƯỢNG NGAY"
        };

      case "SOCIAL_ADS":
        return {
          style: "SOCIAL_ADS",
          headline: `⚡ HOT TREND 2026: ${title} ĐÃ CẬP BẾN! ⚡`,
          bodyHtml: `
<p>💖 MUST-HAVE ITEM CHO TỦ ĐỒ CỦA NÀNG MÙA NÀY! 💖</p>
<p>Chiếc <strong>${title}</strong> đang làm mưa làm gió khắp các nền tảng mạng xã hội đã chính thức có sẵn tại shop!</p>
<p>✨ <strong>Điểm cộng tuyệt đối:</strong></p>
<p>🌿 Chất liệu: ${material} mềm mịn, thoáng mát mướt da.</p>
<p>👗 Thiết kế: Tôn dáng đỉnh cao, cân mọi vóc dáng.</p>
<p>🎨 Màu sắc trendy, cực tôn da khi lên hình.</p>
<p>🏷️ Giá ưu đãi mở bán: Chỉ từ <strong>${minPrice}đ</strong></p>
<p>🛵 FREESHIP toàn quốc cho đơn hàng từ 2 sản phẩm!</p>
<p>#thoitrangnu #hottrend2026 #ootd #fashion #quanao #damxinh</p>
          `.trim(),
          bodyText: `HOT TREND 2026: ${title}\nChất vải ${material} cực đẹp, giá chỉ từ ${minPrice}đ. Nhắn tin nhận ưu đãi Freeship ngay!`,
          callToAction: "INBOX NHẬN ƯU ĐÃI & BẢNG SIZE"
        };

      case "STORYTELLING":
      default:
        return {
          style: "STORYTELLING",
          headline: `CÂU CHUYỆN TẠO NÊN ${title}: SỰ TINH TẾ TỪ ĐƯỜNG KIM MŨI CHỈ`,
          bodyHtml: `
<p>Chúng tôi tin rằng, trang phục đẹp nhất không chỉ nằm ở kiểu dáng lộng lẫy, mà là cảm giác tự tin, thoải mái khi bạn khoác lên mình.</p>
<p><strong>${title}</strong> ra đời từ sự trăn trở tìm kiếm một chất liệu <em>${material}</em> vừa giữ được độ bay bổng tự nhiên, vừa mềm mát thân thiện với làn da.</p>
<p>Mỗi chi tiết viền chỉ, nếp gấp đều được người thợ lành nghề chăm chút tỉ mỉ, để mỗi khi diện nó, bạn luôn cảm nhận được sự nâng niu và tỏa sáng theo cách riêng của mình.</p>
          `.trim(),
          bodyText: `Sự tinh tế trong từng đường may. Khám phá ${title} cùng chất liệu ${material} cao cấp.`,
          callToAction: "KHÁM PHÁ BỘ SƯU TẬP NGAY"
        };
    }
  } else {
    // English Marketing Copy
    switch (style) {
      case "AIDA":
        return {
          style: "AIDA",
          headline: `🔥 DON'T MISS OUT: ${title} – 2026 TRENDSETTER!`,
          bodyHtml: `
<p><strong>[ATTENTION]</strong></p>
<p>Looking for the perfect piece that effortlessly elevates your look while providing all-day comfort?</p>

<p><strong>[INTEREST]</strong></p>
<p>Meet the <strong>${title}</strong>, tailored with premium <em>${material}</em> for a breathable, skin-friendly fit and timeless silhouette.</p>

<p><strong>[DESIRE]</strong></p>
<ul>
  <li>✨ Flattering cut designed to enhance your natural silhouette.</li>
  <li>✨ Ultra-versatile: style with heels, sneakers, or tailored blazers.</li>
  <li>✨ Durable stitching that retains color and shape wear after wear.</li>
</ul>

<p><strong>[ACTION]</strong></p>
<p>👉 Limited factory-direct pricing available this week only. Claim yours now!</p>
          `.trim(),
          bodyText: `DON'T MISS OUT: ${title}. Premium ${material}, flattering fit. Order yours today!`,
          callToAction: "SHOP NOW - LIMITED STOCK"
        };

      case "PAS":
        return {
          style: "PAS",
          headline: `⚠️ TIRED OF FAST-FASHION PIECES THAT LOSE SHAPE AFTER ONE WASH?`,
          bodyHtml: `
<p><strong>[PROBLEM]</strong></p>
<p>How often have you bought clothes online only to receive thin, scratchy fabric that shrinks after a single wash?</p>

<p><strong>[AGITATION]</strong></p>
<p>Poor quality clothing wastes your hard-earned money and leaves you feeling self-conscious when you want to look your best.</p>

<p><strong>[SOLUTION]</strong></p>
<p>Invest in true craftsmanship with <strong>${title}</strong>. Made from durable <em>${material}</em>, this piece maintains its luxurious drape and vibrancy season after season.</p>
          `.trim(),
          bodyText: `No more cheap fast-fashion. Upgrade to ${title} made of ${material}. Guaranteed quality!`,
          callToAction: "UPGRADE YOUR WARDROBE NOW"
        };

      case "SOCIAL_ADS":
        return {
          style: "SOCIAL_ADS",
          headline: `⚡ VIRAL FAVORITE: ${title} IS BACK IN STOCK!`,
          bodyHtml: `
<p>💥 <strong>VIRAL OBSESSION:</strong> The piece everyone is talking about has arrived.</p>
<p>✨ Featuring breathable <em>${material}</em>, precision tailoring, and an effortless chic fit.</p>
<p>🚚 <strong>FREE SHIPPING & EASY RETURNS</strong> on all orders today!</p>
          `.trim(),
          bodyText: `VIRAL HIT: ${title}. High-grade ${material}, unbelievable comfort. Tap to claim free shipping!`,
          callToAction: "CLAIM OFFER & SHOP NOW"
        };

      case "STORYTELLING":
      default:
        return {
          style: "STORYTELLING",
          headline: `THE STORY BEHIND ${title}: CRAFTSMANSHIP IN EVERY THREAD`,
          bodyHtml: `
<p>We believe great style begins with mindful design and honest materials.</p>
<p>The story of <strong>${title}</strong> began with a search for <em>${material}</em> that could offer both graceful flow and enduring strength.</p>
<p>Every seam and hem is meticulously inspected, creating a staple piece you'll treasure for years to come.</p>
          `.trim(),
          bodyText: `Every stitch tells a story. Discover ${title} crafted in premium ${material}.`,
          callToAction: "EXPLORE THE COLLECTION"
        };
    }
  }
}
