import { PersonalizationField, PersonalizationImageValue, PersonalizationVisibilityRule } from "@hub1688/shared-types";

export interface PersonalizationValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  visibleFieldIds: string[];
  completedRequired: number;
  totalRequired: number;
}

const hasValue = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value as Record<string, unknown>).length > 0;
  return true;
};

export const getPersonalizationImageUrl = (value: unknown): string | undefined => {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value && typeof value === "object" && typeof (value as PersonalizationImageValue).url === "string") {
    return (value as PersonalizationImageValue).url;
  }
  return undefined;
};

export const isPersonalizationFieldVisible = (
  field: PersonalizationField,
  values: Record<string, unknown>
): boolean => {
  const evaluateRule = (rule: PersonalizationVisibilityRule): boolean => {
    const current = values[rule.fieldId];
    const equal = current === rule.value || (current !== undefined && rule.value !== undefined && String(current) === String(rule.value));
    const included = (rule.values || []).some(candidate => candidate === current || String(candidate) === String(current));
    switch (rule.operator || "EQUALS") {
      case "NOT_EQUALS": return !equal;
      case "IN": return included;
      case "NOT_EMPTY": return hasValue(current);
      default: return equal;
    }
  };
  const rules = field.conditions?.rules;
  if (rules?.length) return field.conditions?.mode === "ANY" ? rules.some(evaluateRule) : rules.every(evaluateRule);
  const rule = field.visibleWhen;
  if (!rule) return true;
  return evaluateRule(rule);
};

const validateSingleField = (field: PersonalizationField, value: unknown): string | undefined => {
  if (field.required && (field.type === "CHECKBOX" ? value !== true : !hasValue(value))) {
    return `Vui lòng hoàn thành ${field.label}`;
  }
  if (!hasValue(value)) return undefined;

  if ((field.type === "TEXT" || field.type === "TEXTAREA") && typeof value !== "string") {
    return `${field.label} không hợp lệ`;
  }
  if (typeof value === "string" && field.maxLength && value.length > field.maxLength) {
    return `${field.label} tối đa ${field.maxLength} ký tự`;
  }
  if ((field.type === "TEXT" || field.type === "TEXTAREA") && typeof value === "string") {
    if (field.allowedCharacters) {
      const allowed = new Set(Array.from(field.allowedCharacters));
      const invalid = Array.from(value).find(character => !allowed.has(character));
      if (invalid) return `${field.label} chứa ký tự không được phép`;
    }
    if (field.allowedPattern) {
      try {
        if (!new RegExp(field.allowedPattern, "u").test(value)) return `${field.label} không đúng định dạng`;
      } catch {
        // An invalid merchant pattern must not make every customer order fail.
      }
    }
  }
  if (field.type === "NUMBER") {
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue)) return `${field.label} phải là một số`;
    if (field.min !== undefined && numberValue < field.min) return `${field.label} tối thiểu ${field.min}`;
    if (field.max !== undefined && numberValue > field.max) return `${field.label} tối đa ${field.max}`;
  }
  if (["SELECT", "COLOR_SWATCH", "ASSET_PICKER"].includes(field.type) && field.options?.length) {
    if (!field.options.some(option => option.value === value)) return `${field.label} không còn khả dụng`;
  }
  if (field.type === "IMAGE_UPLOAD") {
    const image = typeof value === "object" && value ? value as PersonalizationImageValue : undefined;
    if (!image?.url) return `${field.label} chưa tải lên thành công`;
    if (!/^https?:\/\//i.test(image.url) && !image.url.startsWith("/uploads/products/")) {
      return `${field.label} phải được tải lên kho ảnh trước khi đặt hàng`;
    }
    if (field.minImageWidth && (!image.width || image.width < field.minImageWidth)) {
      return `Ảnh cần rộng tối thiểu ${field.minImageWidth}px`;
    }
    if (field.minImageHeight && (!image.height || image.height < field.minImageHeight)) {
      return `Ảnh cần cao tối thiểu ${field.minImageHeight}px`;
    }
    if (field.maxFileSizeMB && image.sizeBytes && image.sizeBytes > field.maxFileSizeMB * 1024 * 1024) {
      return `Ảnh không được vượt quá ${field.maxFileSizeMB}MB`;
    }
    if (field.accept?.length && image.mimeType && !field.accept.includes(image.mimeType)) {
      return `Định dạng ảnh của ${field.label} không được hỗ trợ`;
    }
  }
  if (field.type === "REPEAT_GROUP" && field.repeat) {
    if (!Array.isArray(value)) return `${field.label} không hợp lệ`;
    if (value.length < field.repeat.minItems) return `${field.label} cần ít nhất ${field.repeat.minItems} mục`;
    if (value.length > field.repeat.maxItems) return `${field.label} tối đa ${field.repeat.maxItems} mục`;
    for (let index = 0; index < value.length; index += 1) {
      const item = value[index] as Record<string, unknown>;
      for (const child of field.repeat.fields) {
        if (!isPersonalizationFieldVisible(child, { ...valuesFromUnknown(value), ...item })) continue;
        const childError = validateSingleField(child, item?.[child.id]);
        if (childError) return `${field.repeat.itemLabel || "Mục"} ${index + 1}: ${childError}`;
      }
    }
  }
  return undefined;
};

/** Sum option-level price deltas for the current personalization payload. */
export const calculatePersonalizationPriceDelta = (
  fields: PersonalizationField[] = [],
  values: Record<string, unknown> = {}
): number => {
  let total = 0;
  for (const field of fields) {
    if (!isPersonalizationFieldVisible(field, values)) continue;
    const value = values[field.id];
    if (field.type === "REPEAT_GROUP" && field.repeat && Array.isArray(value)) {
      for (const item of value) {
        if (item && typeof item === "object") total += calculatePersonalizationPriceDelta(field.repeat.fields, item as Record<string, unknown>);
      }
      continue;
    }
    const option = field.options?.find(candidate => candidate.value === value || String(candidate.value) === String(value));
    total += Number(option?.priceDeltaVND || 0);
  }
  return Math.round(total);
};

const valuesFromUnknown = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

export const validatePersonalizationValues = (
  fields: PersonalizationField[] = [],
  values: Record<string, unknown> = {}
): PersonalizationValidationResult => {
  const errors: Record<string, string> = {};
  const visibleFields = fields.filter(field => isPersonalizationFieldVisible(field, values));
  let completedRequired = 0;
  let totalRequired = 0;

  for (const field of visibleFields) {
    if (field.required) {
      totalRequired += 1;
      if (field.type === "CHECKBOX" ? values[field.id] === true : hasValue(values[field.id])) completedRequired += 1;
    }
    const error = validateSingleField(field, values[field.id]);
    if (error) errors[field.id] = error;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    visibleFieldIds: visibleFields.map(field => field.id),
    completedRequired,
    totalRequired
  };
};
