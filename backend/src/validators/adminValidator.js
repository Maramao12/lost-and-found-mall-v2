/* =====================================================================
   src/validators/adminValidator.js

   Validation des requêtes du module administration :
   - signalements
   - modération des déclarations

   .strict() : refuse les champs inconnus.
   ===================================================================== */

const { z } = require("zod");

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Identifiant invalide");

// ---------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------
const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

// ---------------------------------------------------------------------
// GET /api/admin/reports
// Filtrage des signalements
// ---------------------------------------------------------------------
const listReportsSchema = paginationSchema.extend({
  motif: z
    .enum([
      "FAUSSE_DECLARATION",
      "CONTENU_INAPPROPRIE",
      "DOUBLON",
      "INFORMATION_INCORRECTE",
      "AUTRE",
    ])
    .optional(),

  traite: z.enum(["true", "false"]).optional(),

  dateDebut: z.string().datetime({ offset: true }).optional(),
  dateFin: z.string().datetime({ offset: true }).optional(),

  search: z.string().trim().max(100).optional(),
});

// ---------------------------------------------------------------------
// GET /api/admin/reports/:id
// ---------------------------------------------------------------------
const reportIdSchema = z.object({
  id: objectId,
});

// ---------------------------------------------------------------------
// PATCH /api/admin/reports/:id/resolve
// Traitement d'un signalement
// ---------------------------------------------------------------------
const resolveReportSchema = z
  .object({
    decision: z.enum([
      "NON_JUSTIFIE",
      "JUSTIFIE_MAINTENIR",
      "JUSTIFIE_MASQUER",
    ]),

    commentaireAdmin: z
      .string()
      .trim()
      .min(5, "Commentaire : 5 caractères minimum")
      .max(500, "Commentaire : 500 caractères maximum")
      .optional(),
  })
  .strict();

// ---------------------------------------------------------------------
// GET /api/admin/declarations
// Filtrage des déclarations
// ---------------------------------------------------------------------
const dateJour = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date : format YYYY-MM-DD attendu");

const listDeclarationsSchema = paginationSchema.extend({
  type: z.enum(["PERDU", "TROUVE"]).optional(),

  statut: z.enum(["PUBLIEE", "EN_COURS", "RESTITUEE", "SUPPRIMEE"]).optional(),

  masquee: z.enum(["true", "false"]).optional(),

  // Recherche regex sur le titre (existante, conservée)
  search: z.string().trim().max(100).optional(),

  // Moteur de recherche du binôme 2 (search.service)
  q: z
    .string()
    .trim()
    .min(2, "Recherche : 2 caractères minimum")
    .max(100)
    .optional(),
  zoneId: objectId.optional(),
  categorieId: objectId.optional(),
  dateDebut: dateJour.optional(), // date de perte / découverte
  dateFin: dateJour.optional(),
  sort: z
    .enum(["recent", "ancien", "evenement_recent", "evenement_ancien"])
    .default("recent"),

  // Propre à la supervision admin
  auteurId: objectId.optional(),
});

// ---------------------------------------------------------------------
// PATCH /api/admin/declarations/:id/moderation
// Masquer / restaurer
// ---------------------------------------------------------------------
const moderationSchema = z
  .object({
    action: z.enum(["MASQUER", "RESTAURER"]),

    motif: z
      .string()
      .trim()
      .min(10, "Motif : 10 caractères minimum")
      .max(500, "Motif : 500 caractères maximum"),
  })
  .strict();

// ---------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------
module.exports = {
  listReportsSchema,
  reportIdSchema,
  resolveReportSchema,
  listDeclarationsSchema,
  moderationSchema,
};
