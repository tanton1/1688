import { Raw1688Product, Raw1688SearchItem } from "@hub1688/shared-types";

export interface SourceAdapter {
  extractDetail(): Promise<Raw1688Product>;
  extractSearchResults(): Promise<Raw1688SearchItem[]>;
  extractShopCatalog(): Promise<Raw1688SearchItem[]>;
}
