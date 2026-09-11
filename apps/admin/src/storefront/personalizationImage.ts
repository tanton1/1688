import { PersonalizationField } from "@hub1688/shared-types";

export interface PreparedPersonalizationImage {
  dataUrl: string;
  fileName: string;
  width: number;
  height: number;
}

const SUPPORTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_OUTPUT_BYTES = 2_300_000;

export const getCustomizationGuestSessionId = (): string => {
  const key = "hub1688_guest_customization_session";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const id = typeof crypto?.randomUUID === "function"
    ? crypto.randomUUID()
    : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, character =>
      (Number(character) ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> Number(character) / 4).toString(16)
    );
  localStorage.setItem(key, id);
  return id;
};

export const createCustomizationId = (): string => {
  if (typeof crypto?.randomUUID === "function") return crypto.randomUUID();
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, character =>
    (Number(character) ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> Number(character) / 4).toString(16)
  );
};

const loadImage = (file: File): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    URL.revokeObjectURL(objectUrl);
    resolve(image);
  };
  image.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    reject(new Error("Không thể đọc nội dung ảnh"));
  };
  image.src = objectUrl;
});

const dataUrlBytes = (dataUrl: string): number => {
  const base64 = dataUrl.split(",")[1] || "";
  return Math.floor(base64.length * 0.75);
};

export async function preparePersonalizationImage(
  file: File,
  field: Pick<PersonalizationField, "accept" | "maxFileSizeMB" | "minImageWidth" | "minImageHeight">
): Promise<PreparedPersonalizationImage> {
  const accepted = field.accept?.length ? new Set(field.accept) : SUPPORTED_TYPES;
  if (!SUPPORTED_TYPES.has(file.type) || !accepted.has(file.type)) {
    throw new Error("Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP");
  }
  const configuredLimit = Math.min(field.maxFileSizeMB || 12, 20) * 1024 * 1024;
  if (file.size > configuredLimit) {
    throw new Error(`Ảnh gốc không được vượt quá ${field.maxFileSizeMB || 12}MB`);
  }

  const image = await loadImage(file);
  if (field.minImageWidth && image.naturalWidth < field.minImageWidth) {
    throw new Error(`Ảnh cần rộng tối thiểu ${field.minImageWidth}px`);
  }
  if (field.minImageHeight && image.naturalHeight < field.minImageHeight) {
    throw new Error(`Ảnh cần cao tối thiểu ${field.minImageHeight}px`);
  }

  const maxEdge = 1600;
  const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
  let width = Math.max(1, Math.round(image.naturalWidth * scale));
  let height = Math.max(1, Math.round(image.naturalHeight * scale));
  let quality = 0.9;
  let dataUrl = "";

  for (let attempt = 0; attempt < 7; attempt += 1) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Trình duyệt không hỗ trợ xử lý ảnh");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, 0, 0, width, height);
    dataUrl = canvas.toDataURL("image/jpeg", quality);
    if (dataUrlBytes(dataUrl) <= MAX_OUTPUT_BYTES) break;
    quality = Math.max(0.58, quality - 0.08);
    if (quality <= 0.62) {
      width = Math.max(480, Math.round(width * 0.82));
      height = Math.max(480, Math.round(height * 0.82));
    }
  }

  if (!dataUrl || dataUrlBytes(dataUrl) > MAX_OUTPUT_BYTES) {
    throw new Error("Không thể nén ảnh xuống dung lượng phù hợp. Vui lòng chọn ảnh khác");
  }

  const baseName = file.name.replace(/\.[^.]+$/, "").slice(0, 80) || "custom-photo";
  return { dataUrl, fileName: `${baseName}.jpg`, width, height };
}
