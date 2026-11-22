/*
 * admin.schema.js
 * Schémas Zod utilisés pour valider les requêtes du Binôme 4.
 */

const { z } = require("zod");

// Identifiant MongoDB : 24 caractères hexadécimaux.
const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Identifiant MongoDB invalide");

// Pagination commune.
const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

// Validation des filtres des signalements.
const reportsQuerySchema = paginationSchema.extend({
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

  dateDebut: z.string().datetime().optional(),
  dateFin: z.string().datetime().optional(),

  search: z.string().trim().max(100).optional(),
});

// Validation de l'identifiant d'un signalement.
const reportIdSchema = z.object({
  id: objectIdSchema,
});

// Décisions possibles pour le traitement.
const resolveReportSchema = z.object({
  decision: z.enum(["NON_JUSTIFIE", "JUSTIFIE_MAINTENIR", "JUSTIFIE_MASQUER"]),

  commentaireAdmin: z.string().trim().max(1000).optional().nullable(),
});

// Filtres pour la consultation des déclarations.
const declarationsQuerySchema = paginationSchema.extend({
  type: z.enum(["PERDU", "TROUVE"]).optional(),

  statut: z.enum(["PUBLIEE", "EN_COURS", "RESTITUEE", "SUPPRIMEE"]).optional(),

  masquee: z.enum(["true", "false"]).optional(),

  search: z.string().trim().max(100).optional(),
});

// Identifiant d'une déclaration.
const declarationIdSchema = z.object({
  id: objectIdSchema,
});

// Action de modération.
const moderationSchema = z.object({
  action: z.enum(["MASQUER", "RESTAURER"]),

  motif: z.string().trim().min(3).max(500),
});

// Recherche des utilisateurs.
const usersQuerySchema = paginationSchema.extend({
  search: z.string().trim().max(100).optional(),

  role: z.enum(["MEMBRE", "ADMIN"]).optional(),

  actif: z.enum(["true", "false"]).optional(),
});

// Identifiant d'un utilisateur.
const userIdSchema = z.object({
  id: objectIdSchema,
});

// Modification du statut d'un compte.
const userStatusSchema = z.object({
  actif: z.boolean(),
});

module.exports = {
  reportIdSchema,
  reportsQuerySchema,
  resolveReportSchema,
  declarationsQuerySchema,
  declarationIdSchema,
  moderationSchema,
  usersQuerySchema,
  userIdSchema,
  userStatusSchema,
};
