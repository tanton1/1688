import React, { useState } from "react";
import { WebProduct } from "@hub1688/shared-types";
import { isStorefrontVariantAvailable } from "@hub1688/shared-utils";
import { ShoppingBag, Eye, Video, Sparkles, Star, ImageOff } from "lucide-react";

interface StoreProductCardProps {
  product: WebProduct;
  onSelect: (product: WebProduct) => void;
  onQuickAdd: (product: WebProduct) => void;
}

export const StoreProductCard: React.FC<StoreProductCardProps> = ({ product, onSelect, onQuickAdd }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const [secondaryImageFailed, setSecondaryImageFailed] = useState(false);
  const minPrice = product.minPriceVND || 0;
  const maxPrice = product.maxPriceVND || minPrice;
  const secondaryImage = product.galleryImages?.find(image => image && image !== product.primaryImage) || product.variants?.find(variant => variant.imageUrl && variant.imageUrl !== product.primaryImage)?.imageUrl;
  const firstDiscountTier = [...(product.volumeDiscountTiers || [])]
    .filter(tier => tier.discountPercent > 0)
    .sort((left, right) => left.minQty - right.minQty)[0];
  const hasReviews = Number(product.reviewCount) > 0 && Number(product.rating) > 0;
  const hasSellableVariant = (product.variants || []).some(isStorefrontVariantAvailable);
  const isOutOfStock = !hasSellableVariant;

  const openDetails = () => onSelect(product);

  return (
    <article
      data-state={isOutOfStock ? "disabled" : "default"}
      className="group relative flex h-full select-none flex-col overflow-hidden rounded-[var(--mc-radius-xs)] border border-[var(--mc-color-border-default)]/15 bg-[var(--mc-color-surface-strong)] transition-[box-shadow,border-color,transform] duration-[var(--mc-motion-instant)] hover:-translate-y-1 hover:border-[var(--mc-color-accent)]/60 hover:shadow-[var(--mc-shadow-lift)] active:translate-y-0 data-[state=disabled]:opacity-70"
    >
      <button type="button" onClick={openDetails} className="mc-focus-ring absolute inset-0 z-10 cursor-pointer rounded-[var(--mc-radius-xs)]" aria-label={`Xem chi tiết ${product.titleVI}${isOutOfStock ? ", hiện đã hết hàng" : ""}`} />
      <div className="relative aspect-square overflow-hidden bg-[var(--mc-color-surface-subtle)]">
        {product.primaryImage && !imageFailed ? (
          <img loading="lazy" decoding="async" src={product.primaryImage} alt={product.titleVI} onError={() => setImageFailed(true)} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-[var(--mc-color-text-secondary)]" role="img" aria-label="Chưa có ảnh sản phẩm">
            <ImageOff className="h-6 w-6" aria-hidden="true" />
            <span className="text-xs font-semibold">Chưa có ảnh</span>
          </div>
        )}
        {secondaryImage && !secondaryImageFailed && (
          <img
            loading="lazy"
            decoding="async"
            src={secondaryImage}
            alt={`${product.titleVI} — ảnh phụ`}
            onError={() => setSecondaryImageFailed(true)}
            className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-[var(--mc-motion-instant)] group-hover:opacity-100"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-0 transition-opacity duration-[var(--mc-motion-instant)] group-hover:opacity-100" aria-hidden="true" />

        <div className="absolute left-3 top-3 z-10 flex flex-col items-start gap-1.5">
          {product.isPersonalized && <span className="inline-flex items-center gap-1 rounded-full bg-[var(--mc-color-accent)] px-2.5 py-1 text-[10px] font-bold text-white"><Sparkles className="h-3 w-3" aria-hidden="true" /> Cá nhân hóa</span>}
          {product.videoUrl && <span className="inline-flex items-center gap-1 rounded-full bg-[var(--mc-color-surface-base)]/75 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-sm"><Video className="h-3 w-3" aria-hidden="true" /> Video</span>}
        </div>
        {firstDiscountTier && <span className="absolute right-3 top-3 z-10 rounded-full bg-[var(--mc-color-surface-strong)] px-2.5 py-1 text-[10px] font-bold text-[var(--mc-color-accent-strong)] shadow-sm">-{firstDiscountTier.discountPercent}% từ {firstDiscountTier.minQty}</span>}
        {product.categoryName && <span className="absolute bottom-3 left-3 z-10 max-w-[78%] truncate rounded-full bg-[var(--mc-color-surface-base)]/75 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">{product.categoryName}</span>}
        <div className="absolute inset-x-0 bottom-0 hidden justify-center p-4 sm:flex">
          <span className="translate-y-2 rounded-full bg-[var(--mc-color-surface-strong)] px-4 py-2 text-xs font-bold text-[var(--mc-color-text-primary)] opacity-0 shadow-lg transition-all duration-[var(--mc-motion-instant)] group-hover:translate-y-0 group-hover:opacity-100"><Eye className="mr-1.5 inline h-3.5 w-3.5 text-[var(--mc-color-accent)]" aria-hidden="true" />Xem chi tiết</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-between p-4">
        <div>
          <div className="mb-2 flex min-h-4 items-center gap-1 text-[11px] font-semibold">
            {hasReviews ? <><Star className="h-3 w-3 fill-current text-[var(--mc-color-accent)]" aria-hidden="true" /><span>{product.rating}</span><span className="font-normal text-[var(--mc-color-text-secondary)]">({product.reviewCount})</span></> : <span className="font-normal text-[var(--mc-color-text-secondary)]">Chưa có đánh giá</span>}
          </div>
          <h3 className="line-clamp-2 min-h-[44px] text-sm font-semibold leading-5 tracking-[-0.015em] text-[var(--mc-color-text-primary)] transition-colors group-hover:text-[var(--mc-color-accent-strong)]" title={product.titleVI}>{product.titleVI}</h3>
          {firstDiscountTier && <p className="mt-2 inline-flex rounded-full bg-[var(--mc-color-surface-muted)]/10 px-2 py-1 text-[10px] font-semibold leading-4 text-[var(--mc-color-accent-strong)]">Mua từ {firstDiscountTier.minQty}: giảm {firstDiscountTier.discountPercent}%</p>}
        </div>

        <div className="mt-4 flex items-end justify-between gap-2 border-t border-[var(--mc-color-border-default)]/10 pt-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-1.5">
              <span className="text-base font-bold tracking-[-0.02em] text-[var(--mc-color-text-primary)]">{minPrice > 0 ? `${minPrice.toLocaleString("vi-VN")}đ` : "Liên hệ"}</span>
              {maxPrice > minPrice && <span className="text-[11px] font-semibold text-[var(--mc-color-text-secondary)]">– {maxPrice.toLocaleString("vi-VN")}đ</span>}
            </div>
          </div>
          <button type="button" disabled={isOutOfStock} onClick={() => onQuickAdd(product)} className="mc-focus-ring relative z-20 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--mc-color-accent)]/30 bg-[var(--mc-color-accent)]/10 text-[var(--mc-color-accent-strong)] transition-colors hover:border-[var(--mc-color-accent)] hover:bg-[var(--mc-color-accent)] hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:border-[var(--mc-color-border-default)]/10 disabled:bg-[var(--mc-color-surface-subtle)] disabled:text-[var(--mc-color-text-secondary)]" title={isOutOfStock ? "Sản phẩm hiện không khả dụng" : product.isPersonalized ? "Mở trang để cá nhân hóa" : "Thêm nhanh vào giỏ hàng"} aria-label={isOutOfStock ? "Sản phẩm hiện không khả dụng" : product.isPersonalized ? `Mở ${product.titleVI} để cá nhân hóa` : `Thêm nhanh ${product.titleVI} vào giỏ hàng`}>
            <ShoppingBag className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
};
