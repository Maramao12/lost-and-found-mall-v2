const { z } = require("zod");
const { objectId, dateJour, TRIS } = require("./searchValidator");

const STATUTS_MEMBRE = ["PUBLIEE", "EN_COURS", "RESTITUEE"];

const memberHistoryQuerySchema = z
  .object({
    q: z
      .string()
      .trim()
      .min(2, "q : 2 caractères minimum")
      .max(100, "q : 100 caractères maximum")
      .optional(),
    type: z
      .enum(["PERDU", "TROUVE"], {
        errorMap: function () {
          return { message: "type doit être PERDU ou TROUVE" };
        },
      })
      .optional(),
    statut: z
      .enum(STATUTS_MEMBRE, {
        errorMap: function () {
          return { message: "statut doit être : " + STATUTS_MEMBRE.join(", ") };
        },
      })
      .optional(),
    categorieId: objectId.optional(),
    zoneId: objectId.optional(),
    dateDebut: dateJour.optional(),
    dateFin: dateJour.optional(),
    dateCreationDebut: dateJour.optional(),
    dateCreationFin: dateJour.optional(),
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
  )
  .refine(
    function (d) {
      return (
        !d.dateCreationDebut ||
        !d.dateCreationFin ||
        d.dateCreationDebut <= d.dateCreationFin
      );
    },
    {
      path: ["dateCreationFin"],
      message:
        "dateCreationFin doit être postérieure ou égale à dateCreationDebut",
    },
  );

module.exports = { memberHistoryQuerySchema };
