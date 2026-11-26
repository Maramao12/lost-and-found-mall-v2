const { z } = require("zod");
const { TYPE_DECLARATION, STATUT_DECLARATION } = require("../constants/enums");

const TRIS = ["recent", "ancien", "evenement_recent", "evenement_ancien"];

// Identifiant MongoDB : 24 caractères hexadécimaux
const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Identifiant invalide");

// Date au format AAAA-MM-JJ. On garde du texte : le service attend du texte.
const dateJour = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Format attendu : AAAA-MM-JJ")
  .refine(function (v) {
    // refuse les dates qui n'existent pas (ex : 2026-02-30)
    const [a, m, j] = v.split("-").map(Number);
    const d = new Date(a, m - 1, j);
    return d.getFullYear() === a && d.getMonth() === m - 1 && d.getDate() === j;
  }, "Cette date n'existe pas");

const searchQuerySchema = z
  .object({
    q: z
      .string()
      .trim()
      .min(2, "q : 2 caractères minimum")
      .max(100, "q : 100 caractères maximum")
      .optional(),
    type: z
      .enum(TYPE_DECLARATION, {
        errorMap: function () {
          return { message: "type doit être PERDU ou TROUVE" };
        },
      })
      .optional(),
    statut: z
      .enum(STATUT_DECLARATION, {
        errorMap: function () {
          return { message: "statut invalide" };
        },
      })
      .optional(),
    categorieId: objectId.optional(),
    zoneId: objectId.optional(),
    dateDebut: dateJour.optional(),
    dateFin: dateJour.optional(),
    sort: z
      .enum(TRIS, {
        errorMap: function () {
          return { message: "sort doit être : " + TRIS.join(", ") };
        },
      })
      .default("recent"),
    page: z.coerce
      .number({ invalid_type_error: "page doit être un nombre" })
      .int("page doit être un entier")
      .min(1, "page : minimum 1")
      .default(1),
    limit: z.coerce
      .number({ invalid_type_error: "limit doit être un nombre" })
      .int("limit doit être un entier")
      .min(1, "limit : minimum 1")
      .max(50, "limit : maximum 50")
      .default(10),
  })
  .strict()
  .refine(
    function (d) {
      return !d.dateDebut || !d.dateFin || d.dateDebut <= d.dateFin;
    },
    {
      path: ["dateFin"],
      message: "dateFin doit être postérieure ou égale à dateDebut",
    },
  );

module.exports = { searchQuerySchema, objectId, dateJour, TRIS };
