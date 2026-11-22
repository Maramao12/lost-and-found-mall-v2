/* =====================================================================
   src/validators/signalementValidator.js

   Validation des données envoyées par un membre qui signale
   une déclaration.

   Les données sont vérifiées avec Zod avant le controller.
   ===================================================================== */

const { z } = require("zod");
const { MOTIF_SIGNALEMENT } = require("../constants/enums");

// Schéma de validation pour la création d'un signalement
const creerSignalementSchema = z.object({
  declarationId: z
    .string()
    .regex(/^[a-fA-F0-9]{24}$/, "Identifiant de déclaration invalide"),

  motif: z.enum(MOTIF_SIGNALEMENT),

  description: z
    .string()
    .trim()
    .min(1, "La description est obligatoire")
    .max(500, "La description ne doit pas dépasser 500 caractères"),
});

module.exports = {
  creerSignalementSchema,
};
