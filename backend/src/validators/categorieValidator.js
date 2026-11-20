/* =====================================================================
   src/validators/categorieValidator.js
   Schémas Zod du domaine "catégories" (binôme 4).
   .strict() : toute clé inconnue est refusée.
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
  .max(100, "Nom : 100 caractères maximum");

// "" est accepté : il sert à EFFACER la description
const description = z
  .string({ invalid_type_error: "Description invalide" })
  .trim()
  .max(300, "Description : 300 caractères maximum");

const createCategorieSchema = z
  .object({
    nom: nom,
    description: description.optional(),
  })
  .strict();

const updateCategorieSchema = z
  .object({
    nom: nom.optional(),
    description: description.optional(),
  })
  .strict()
  .refine(function (o) {
    return Object.keys(o).length > 0;
  }, "Aucune modification fournie");

const idParamsSchema = z.object({ id: objectId });

module.exports = {
  createCategorieSchema,
  updateCategorieSchema,
  idParamsSchema,
};
