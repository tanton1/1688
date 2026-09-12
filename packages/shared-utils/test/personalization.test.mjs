import test from "node:test";
import assert from "node:assert/strict";
import { validatePersonalizationValues, calculatePersonalizationPriceDelta } from "../dist/personalization.js";

test("personalization validates conditional fields and maximum text length", () => {
  const fields = [
    { id: "style", label: "Kiểu", type: "SELECT", required: true, options: [{ id: "photo", label: "Ảnh", value: "photo" }, { id: "text", label: "Chữ", value: "text" }] },
    { id: "name", label: "Tên", type: "TEXT", required: true, maxLength: 6, visibleWhen: { fieldId: "style", value: "text" } },
    { id: "photo", label: "Ảnh", type: "IMAGE_UPLOAD", required: true, minImageWidth: 800, visibleWhen: { fieldId: "style", value: "photo" } }
  ];

  const hiddenText = validatePersonalizationValues(fields, {
    style: "photo",
    photo: { url: "https://cdn.example.com/photo.jpg", width: 1200, height: 1200 }
  });
  assert.equal(hiddenText.valid, true);
  assert.deepEqual(hiddenText.visibleFieldIds, ["style", "photo"]);

  const longText = validatePersonalizationValues(fields, { style: "text", name: "Quá dài" });
  assert.equal(longText.valid, false);
  assert.match(longText.errors.name, /tối đa 6/);
});

test("personalization requires persisted image metadata", () => {
  const fields = [{ id: "photo", label: "Ảnh chân dung", type: "IMAGE_UPLOAD", required: true, minImageWidth: 1000, minImageHeight: 1000 }];
  assert.equal(validatePersonalizationValues(fields, {}).valid, false);
  assert.match(validatePersonalizationValues(fields, { photo: { url: "data:image/jpeg;base64,abc", width: 1200, height: 1200 } }).errors.photo, /kho ảnh/);
  assert.match(validatePersonalizationValues(fields, { photo: { url: "https://cdn.example.com/a.jpg", width: 600, height: 1200 } }).errors.photo, /rộng tối thiểu/);
});

test("personalization validates repeat groups and required checkboxes", () => {
  const fields = [
    { id: "people", label: "Nhân vật", type: "REPEAT_GROUP", required: true, repeat: { minItems: 1, maxItems: 3, itemLabel: "Người", fields: [{ id: "name", label: "Tên", type: "TEXT", required: true }] } },
    { id: "approval", label: "Xác nhận", type: "CHECKBOX", required: true }
  ];
  const invalid = validatePersonalizationValues(fields, { people: [{}], approval: false });
  assert.match(invalid.errors.people, /Người 1/);
  assert.ok(invalid.errors.approval);

  const valid = validatePersonalizationValues(fields, { people: [{ name: "An" }, { name: "Bình" }], approval: true });
  assert.equal(valid.valid, true);
  assert.equal(valid.completedRequired, 2);
});

test("personalization supports ALL/ANY conditions, patterns and option pricing", () => {
  const fields = [
    { id: "style", label: "Kiểu", type: "SELECT", options: [{ id: "a", label: "A", value: "a", priceDeltaVND: 15000 }, { id: "b", label: "B", value: "b", priceDeltaVND: 25000 }] },
    { id: "name", label: "Tên", type: "TEXT", conditions: { mode: "ANY", rules: [{ fieldId: "style", value: "a" }, { fieldId: "style", value: "b" }] }, allowedPattern: "^[A-Za-z ]+$" }
  ];
  assert.equal(validatePersonalizationValues(fields, { style: "a", name: "An" }).valid, true);
  assert.equal(validatePersonalizationValues(fields, { style: "a", name: "Án" }).valid, false);
  assert.equal(calculatePersonalizationPriceDelta(fields, { style: "b", name: "An" }), 25000);
});
