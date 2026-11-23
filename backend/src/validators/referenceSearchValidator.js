const { z } = require("zod");

const TRIS_NOM = ["nom_asc", "nom_desc"];

const referenceSearchQuerySchema = z
  .object({
    q: z
      .string()
      .trim()
      .min(1, "q : 1 caractère minimum")
      .max(100, "q : 100 caractères maximum")
      .optional(),
    sort: z
      .enum(TRIS_NOM, {
        errorMap: function () {
          return { message: "sort doit être : " + TRIS_NOM.join(", ") };
        },
      })
      .default("nom_asc"),
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
  .strict(); // refuse les paramètres inconnus

module.exports = { referenceSearchQuerySchema };
