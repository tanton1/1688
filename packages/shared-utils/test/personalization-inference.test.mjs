import test from "node:test";
import assert from "node:assert/strict";
import { inferPersonalizationSchema } from "../dist/personalization-inference.js";

test("customizer asset groups become personalization fields without synthetic SKUs", () => {
  const result = inferPersonalizationSchema({
    title: "Custom Birth Flower & Name Personalized Jewelry Dish",
    customOptionGroups: [{
      id: "custom-style",
      name: "Choose Your Style",
      kind: "PERSONALIZATION",
      inputType: "ASSET_PICKER",
      required: true,
      source: "EXTERNAL_CUSTOMIZER",
      values: [
        { id: "flower-jan", label: "January", imageUrl: "https://cdn.example.com/january.jpg" },
        { id: "flower-feb", label: "February", imageUrl: "https://cdn.example.com/february.jpg" }
      ]
    }]
  });

  assert.equal(result.isPersonalized, true);
  assert.equal(result.reviewRequired, false);
  assert.equal(result.personalizationFields.length, 1);
  assert.equal(result.personalizationFields[0].type, "ASSET_PICKER");
  assert.equal(result.personalizationFields[0].options[0].previewAssetUrl, "https://cdn.example.com/january.jpg");
});

test("title signal never invents a name or upload field", () => {
  const result = inferPersonalizationSchema({ title: "Personalized ceramic tray" });

  assert.equal(result.isPersonalized, true);
  assert.equal(result.reviewRequired, true);
  assert.deepEqual(result.personalizationFields, []);
});

test("customizer text and upload evidence maps to explicit fields", () => {
  const result = inferPersonalizationSchema({
    title: "Custom photo gift",
    customizationEvidence: {
      hasCustomTextInput: true,
      hasImageUpload: true,
      textFields: [
        { id: "name", label: "Name", type: "TEXT", required: true, maxLength: 40 },
        { id: "photo", label: "Upload photo", type: "IMAGE_UPLOAD", required: true, accept: ["image/jpeg"] }
      ]
    }
  });

  assert.equal(result.isPersonalized, true);
  assert.equal(result.reviewRequired, false);
  assert.deepEqual(result.personalizationFields.map(field => field.type), ["TEXT", "IMAGE_UPLOAD"]);
  assert.equal(result.personalizationFields[0].maxLength, 40);
});

test("customizer input copy is preserved from source evidence", () => {
  const result = inferPersonalizationSchema({
    customizationEvidence: {
      textFields: [{
        id: "name",
        label: "Enter name",
        type: "TEXT",
        placeholder: "Type a name",
        helpText: "Up to 30 characters"
      }]
    }
  });

  assert.equal(result.personalizationFields[0].placeholder, "Type a name");
  assert.equal(result.personalizationFields[0].helpText, "Up to 30 characters");
});
