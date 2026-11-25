/* =====================================================================
   src/validators/statsValidator.js
   Paramètres de GET /api/admin/stats/evolution (binôme 4).
   ===================================================================== */

const { z } = require("zod");

// GET /api/admin/stats/evolution?periode=jour&depuis=2026-11-01&jusqua=2026-11-30
const evolutionQuerySchema = z
  .object({
    periode: z.enum(["jour", "mois"]).default("jour"),
    depuis: z.coerce.date().optional(),
    jusqua: z.coerce.date().optional(),
  })
  .refine(function (q) {
    return !(q.depuis && q.jusqua) || q.depuis <= q.jusqua;
  }, "depuis doit être antérieure à jusqua");

module.exports = { evolutionQuerySchema };
