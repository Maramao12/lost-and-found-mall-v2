/* =====================================================================
   src/validators/declarationValidator.js
   ---------------------------------------------------------------------
   Schémas Zod du domaine "déclarations", utilisés avec validate(schema).
   .strict() : toute clé inconnue est refusée (ex : un client qui envoie
   "auteurId" ou "statut" à la création reçoit une erreur 400, car ces
   champs sont décidés par le serveur).
   ===================================================================== */

const { z } = require("zod");
const { TYPE_DECLARATION, STATUT_DECLARATION } = require("../constants/enums");

// ---------- Briques réutilisables ----------
const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Identifiant invalide");

const titre = z
  .string({
    required_error: "Titre obligatoire",
    invalid_type_error: "Titre invalide",
  })
  .trim()
  .min(3, "Titre : 3 caractères minimum")
  .max(120, "Titre : 120 caractères maximum");

const description = z
  .string({
    required_error: "Description obligatoire",
    invalid_type_error: "Description invalide",
  })
  .trim()
  .min(5, "Description : 5 caractères minimum")
  .max(2000, "Description : 2000 caractères maximum");

// "" est accepté : il sert à EFFACER la photo
const photoUrl = z
  .string({ invalid_type_error: "photoUrl invalide" })
  .trim()
  .max(500, "photoUrl : 500 caractères maximum")
  .refine(function (v) {
    return v === "" || /^https?:\/\/\S+$/i.test(v);
  }, "photoUrl doit être une URL http(s)");

// Date à laquelle l'objet a été perdu / trouvé.
// Le client envoie du texte ("2026-11-19" ou date ISO), Zod renvoie un Date.
// La comparaison avec "maintenant" est faite à CHAQUE requête (pas au
// démarrage du serveur). Tolérance de 5 minutes pour les décalages d'horloge.
const TOLERANCE_MS = 5 * 60 * 1000;

const dateEvenement = z
  .string({
    required_error: "Date de l'événement obligatoire",
    invalid_type_error: "Date de l'événement invalide",
  })
  .trim()
  .refine(function (v) {
    return !isNaN(Date.parse(v));
  }, "Date de l'événement invalide (format AAAA-MM-JJ)")
  .transform(function (v) {
    return new Date(v);
  })
  .refine(function (d) {
    return d.getTime() <= Date.now() + TOLERANCE_MS;
  }, "La date ne peut pas être dans le futur")
  .refine(function (d) {
    return d.getFullYear() >= 2000;
  }, "Date de l'événement trop ancienne");

function auMoinsUnChamp(objet) {
  return Object.keys(objet).length > 0;
}

// ---------- Création ----------
const createDeclarationSchema = z
  .object({
    type: z.enum(TYPE_DECLARATION, {
      errorMap: function () {
        return { message: "type doit être PERDU ou TROUVE" };
      },
    }),
    titre: titre,
    description: description,
    dateEvenement: dateEvenement,
    categorieId: objectId,
    zoneId: objectId,
    photoUrl: photoUrl.optional(),
  })
  .strict();

// ---------- Modification (le type n'est PAS modifiable) ----------
const updateDeclarationSchema = z
  .object({
    titre: titre.optional(),
    description: description.optional(),
    dateEvenement: dateEvenement.optional(),
    categorieId: objectId.optional(),
    zoneId: objectId.optional(),
    photoUrl: photoUrl.optional(),
  })
  .strict()
  .refine(auMoinsUnChamp, "Aucune modification fournie");

// ---------- Changement de statut ----------
// SUPPRIMEE n'est pas accepté ici : on passe par DELETE /:id
const STATUTS_MODIFIABLES = STATUT_DECLARATION.filter(function (s) {
  return s !== "SUPPRIMEE";
});

const changeStatusSchema = z
  .object({
    statut: z.enum(STATUTS_MODIFIABLES, {
      errorMap: function () {
        return {
          message: "statut doit être : " + STATUTS_MODIFIABLES.join(", "),
        };
      },
    }),
  })
  .strict();

// ---------- Suppression ----------
// motif : facultatif pour l'auteur, obligatoire (10 car. min) pour l'admin
// (règle vérifiée dans le contrôleur, d'après le diagramme de séquence)
const deleteDeclarationSchema = z
  .object({
    motif: z
      .string({ invalid_type_error: "Motif invalide" })
      .trim()
      .min(10, "Motif : 10 caractères minimum")
      .max(500)
      .optional(),
  })
  .strict();

// ---------- Paramètres d'URL et requêtes ----------
const idParamsSchema = z.object({ id: objectId });

// GET /api/declarations/me?page=1&limit=10&statut=PUBLIEE&type=PERDU
const listMineQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  statut: z.enum(STATUTS_MODIFIABLES).optional(),
  type: z.enum(TYPE_DECLARATION).optional(),
});

module.exports = {
  createDeclarationSchema,
  updateDeclarationSchema,
  changeStatusSchema,
  deleteDeclarationSchema,
  idParamsSchema,
  listMineQuerySchema,
};

