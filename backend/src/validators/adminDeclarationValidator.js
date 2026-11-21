/* =====================================================================
   src/validators/adminDeclarationValidator.js
   Paramètres de GET /api/admin/declarations (binôme 4).
   ===================================================================== */

const { z } = require("zod");
const { TYPE_DECLARATION, STATUT_DECLARATION } = require("../constants/enums");

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Identifiant invalide");

// GET /api/admin/declarations?page=1&limit=10&statut=PUBLIEE&type=PERDU
//   &zoneId=...&categorieId=...&auteurId=...&q=sac noir
//   &depuis=2026-11-01&jusqua=2026-11-30&tri=recent
const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  statut: z.enum(STATUT_DECLARATION).optional(),
  type: z.enum(TYPE_DECLARATION).optional(),
  zoneId: objectId.optional(),
  categorieId: objectId.optional(),
  auteurId: objectId.optional(),
  q: z
    .string()
    .trim()
    .min(2, "Recherche : 2 caractères minimum")
    .max(100)
    .optional(),
  depuis: z.coerce.date().optional(),
  jusqua: z.coerce.date().optional(),
  tri: z.enum(["recent", "ancien"]).default("recent"),
});

module.exports = { listQuerySchema };
