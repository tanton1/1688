import React from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { WebProduct } from "@hub1688/shared-types";
import { StoreProductCard } from "./StoreProductCard";

interface StoreDiscoverySectionsProps {
  products: WebProduct[];
  categories: string[];
  onCategorySelect: (category: string) => void;
  onSelectProduct: (product: WebProduct) => void;
  onQuickAdd: (product: WebProduct) => void;
}

/**
 * Editorial discovery blocks inspired by the dense, browse-first homepage pattern
 * used by high-converting personalization stores. Data is intentionally sourced
 * from the live catalog so the blocks never advertise products that are unavailable.
 */
export const StoreDiscoverySections: React.FC<StoreDiscoverySectionsProps> = ({
  products,
  categories,
  onCategorySelect,
  onSelectProduct,
  onQuickAdd
}) => {
  if (products.length === 0) return null;

  const categoryTiles = Array.from(new Set(categories.filter(Boolean)))
    .slice(0, 6)
    .map(category => ({
      category,
      product: products.find(product => product.categoryName === category)
    }))
    .filter(tile => tile.product);
  const trendingProducts = products.slice(0, 8);

  return (
    <section className="border-b border-[var(--mc-color-border-default)]/10 bg-[var(--mc-color-surface-canvas)]" aria-label="Khám phá bộ sưu tập">
      <div className="mc-content-width mx-auto max-w-7xl space-y-10 px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
        {categoryTiles.length > 0 && (
          <div>
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <p className="mc-eyebrow">Khám phá nhanh</p>
                <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-[var(--mc-color-text-primary)]">Chọn theo danh mục</h2>
              </div>
              <button type="button" onClick={() => onCategorySelect("ALL")} className="mc-focus-ring inline-flex min-h-10 shrink-0 items-center gap-1 rounded-full px-3 text-xs font-bold text-[var(--mc-color-accent-strong)] transition-colors hover:bg-[var(--mc-color-accent)]/10">
                Xem tất cả <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
            <div className="mc-no-scrollbar grid auto-cols-[150px] grid-flow-col gap-3 overflow-x-auto pb-2 sm:auto-cols-[180px] sm:gap-4">
              {categoryTiles.map(({ category, product }) => (
                <button key={category} type="button" onClick={() => onCategorySelect(category)} className="mc-focus-ring group relative aspect-[4/5] overflow-hidden rounded-[var(--mc-radius-xs)] bg-[var(--mc-color-surface-strong)] text-left shadow-[var(--mc-shadow-soft)] transition-transform hover:-translate-y-1">
                  {product?.primaryImage ? <img src={product.primaryImage} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /> : <div className="h-full w-full bg-[var(--mc-color-surface-subtle)]" />}
                  <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent" aria-hidden="true" />
                  <span className="absolute inset-x-3 bottom-3 line-clamp-2 text-sm font-bold leading-5 text-white">{category}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div id="store-trending">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="mc-eyebrow inline-flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Gợi ý nổi bật</p>
              <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-[var(--mc-color-text-primary)]">Trending hôm nay</h2>
              <p className="mt-1 text-sm text-[var(--mc-color-text-secondary)]">Những thiết kế mới và nổi bật đang có sẵn trong cửa hàng.</p>
            </div>
            <button type="button" onClick={() => onCategorySelect("ALL")} className="mc-focus-ring hidden min-h-10 shrink-0 items-center gap-1 rounded-full px-3 text-xs font-bold text-[var(--mc-color-accent-strong)] transition-colors hover:bg-[var(--mc-color-accent)]/10 sm:inline-flex">
              Xem toàn bộ <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
          <div className="mc-no-scrollbar grid auto-cols-[220px] grid-flow-col gap-4 overflow-x-auto pb-3 sm:auto-cols-[250px] sm:gap-5">
            {trendingProducts.map(product => (
              <StoreProductCard key={product.id || product.slug} product={product} onSelect={onSelectProduct} onQuickAdd={onQuickAdd} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
