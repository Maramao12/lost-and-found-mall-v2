/* =====================================================================
   src/validators/zoneValidator.js
   Schémas Zod des zones du centre commercial
   ===================================================================== */

const { z } = require("zod");

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Identifiant invalide");

const nom = z
  .string({
    required_error: "Nom obligatoire",
    invalid_type_error: "Nom invalide",
  })
  .trim()
  .min(2, "Nom : 2 caractères minimum")
  .max(60, "Nom : 60 caractères maximum");

// "" est accepté : il sert à EFFACER la valeur
const description = z
  .string({ invalid_type_error: "Description invalide" })
  .trim()
  .max(300, "Description : 300 caractères maximum");

const emplacement = z
  .string({ invalid_type_error: "Emplacement invalide" })
  .trim()
  .max(100, "Emplacement : 100 caractères maximum");

const createZoneSchema = z
  .object({
    nom: nom,
    description: description.optional(),
    emplacement: emplacement.optional(),
  })
  .strict();

const updateZoneSchema = z
  .object({
    nom: nom.optional(),
    description: description.optional(),
    emplacement: emplacement.optional(),
  })
  .strict()
  .refine(function (o) {
    return Object.keys(o).length > 0;
  }, "Aucune modification fournie");

const idParamsSchema = z.object({ id: objectId });

module.exports = { createZoneSchema, updateZoneSchema, idParamsSchema };
