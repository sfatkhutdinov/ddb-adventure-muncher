// Foundry VTT document schema validator for DDB Adventure Muncher
// This utility validates exported JSON against Foundry VTT document templates
// Usage: require and call validateFoundryDocument(doc, type)

const fs = require("fs");
const path = require("path");
const Ajv = require("ajv");

const templates = {
  adventure: require("../../content/templates/adventure.json"),
  journal: require("../../content/templates/journal-pages.json"),
  scene: require("../../content/templates/scene.json"),
  table: require("../../content/templates/table.json")
};

function getType(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function getSchemaFromTemplate(template) {
  if (template === null) return { type: "null" };
  if (Array.isArray(template)) {
    // Assume homogeneous arrays, use first element as schema
    if (template.length === 0) return { type: "array", items: {} };
    return { type: "array", items: getSchemaFromTemplate(template[0]) };
  }
  if (typeof template === "object") {
    const schema = { type: "object", properties: {}, required: [] };
    for (const [key, value] of Object.entries(template)) {
      schema.properties[key] = getSchemaFromTemplate(value);
      schema.required.push(key);
    }
    return schema;
  }
  // Primitive types
  return { type: typeof template };
}

const ajv = new Ajv({ allErrors: true });
const schemas = {};
for (const [type, template] of Object.entries(templates)) {
  schemas[type] = getSchemaFromTemplate(template);
}

function validateFoundryDocument(doc, type) {
  if (!schemas[type]) throw new Error(`Unknown Foundry document type: ${type}`);
  const validate = ajv.compile(schemas[type]);
  const valid = validate(doc);
  if (!valid) {
    const errors = validate.errors.map(e => `${e.instancePath} ${e.message}`).join("; ");
    throw new Error(`Invalid ${type} document: ${errors}`);
  }
  return true;
}

module.exports = { validateFoundryDocument };
