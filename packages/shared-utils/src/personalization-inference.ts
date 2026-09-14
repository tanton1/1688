import type {
  CustomizationEvidence,
  PersonalizationField,
  PersonalizationOptionItem,
  SourceOptionGroup
} from "@hub1688/shared-types";

export interface PersonalizationInferenceInput {
  title?: string;
  description?: string;
  customOptionGroups?: SourceOptionGroup[];
  personalizationFields?: PersonalizationField[];
  customizationEvidence?: CustomizationEvidence;
}

export interface PersonalizationInferenceResult {
  isPersonalized: boolean;
  personalizationFields: PersonalizationField[];
  confidence: number;
  reviewRequired: boolean;
  evidence: CustomizationEvidence;
}

const slugify = (value: string, fallback: string): string => {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
};

const uniqueId = (candidate: string, used: Set<string>, fallbackIndex: number): string => {
  const base = slugify(candidate, `custom-${fallbackIndex + 1}`);
  let id = base;
  let suffix = 2;
  while (used.has(id)) id = `${base}-${suffix++}`;
  used.add(id);
  return id;
};

const normalizeOption = (
  option: SourceOptionGroup["values"][number],
  index: number,
  used: Set<string>
): PersonalizationOptionItem => ({
  id: uniqueId(option.id || option.label, used, index),
  label: option.label,
  value: option.sourceValue || option.id || option.label,
  previewAssetUrl: option.imageUrl,
  thumbnail: option.imageUrl
});

const groupToField = (
  group: SourceOptionGroup,
  index: number,
  used: Set<string>
): PersonalizationField => {
  const options = group.values.map((option, optionIndex) => normalizeOption(option, optionIndex, new Set<string>()));
  const hasAssets = options.some(option => Boolean(option.previewAssetUrl || option.thumbnail));
  const type = group.inputType || (hasAssets ? "ASSET_PICKER" : "SELECT");
  return {
    id: uniqueId(group.id || group.name, used, index),
    label: group.name,
    type,
    required: group.required !== false,
    options,
    helpText: hasAssets ? "Chọn một mẫu để xem trước trên sản phẩm." : undefined
  };
};

const hintsToFields = (
  hints: CustomizationEvidence["textFields"] | undefined,
  used: Set<string>,
  startIndex: number
): PersonalizationField[] => (hints || []).map((hint, index) => ({
  id: uniqueId(hint.id || hint.label, used, startIndex + index),
  label: hint.label,
  type: hint.type,
  required: hint.required !== false,
  maxLength: hint.maxLength,
  accept: hint.accept,
  placeholder: hint.placeholder,
  maxFileSizeMB: hint.type === "IMAGE_UPLOAD" ? 12 : undefined,
  helpText: hint.helpText || (hint.type === "IMAGE_UPLOAD" ? "Ảnh rõ nét giúp bản in đẹp hơn." : undefined)
}));

/**
 * Resolve customizer evidence into the storefront schema without inventing a
 * customer field when the source only contains a marketing title.
 */
export const inferPersonalizationSchema = (
  input: PersonalizationInferenceInput
): PersonalizationInferenceResult => {
  const evidence: CustomizationEvidence = { ...(input.customizationEvidence || {}) };
  const fields: PersonalizationField[] = [];
  const used = new Set<string>();

  for (const field of input.personalizationFields || []) {
    if (!field?.id || !field?.label || !field?.type) continue;
    const id = uniqueId(field.id, used, fields.length);
    fields.push({ ...field, id });
  }

  for (const group of input.customOptionGroups || []) {
    if (group.kind !== "PERSONALIZATION") continue;
    fields.push(groupToField(group, fields.length, used));
  }

  fields.push(...hintsToFields(evidence.textFields, used, fields.length));

  const sourceText = `${input.title || ""} ${input.description || ""}`.toLowerCase();
  const titleSignal = /\b(personalized|personalised|custom|customize|customized|engraved|upload\s*(a\s*)?photo|name\s*gift)\b/i.test(sourceText);
  const explicitEvidence = Boolean(
    fields.length > 0 ||
    evidence.hasCustomTextInput ||
    evidence.hasImageUpload ||
    evidence.hasCustomerAssetPicker ||
    (input.customOptionGroups || []).length > 0
  );
  const isPersonalized = explicitEvidence || titleSignal;
  const reviewRequired = Boolean(isPersonalized && fields.length === 0) || evidence.reviewRequired === true;

  return {
    isPersonalized,
    personalizationFields: fields,
    confidence: fields.length > 0 ? Math.max(0.9, evidence.confidence || 0.9) : explicitEvidence ? (evidence.confidence || 0.75) : titleSignal ? 0.45 : 0,
    reviewRequired,
    evidence: {
      ...evidence,
      confidence: fields.length > 0 ? Math.max(0.9, evidence.confidence || 0.9) : evidence.confidence,
      reviewRequired
    }
  };
};
