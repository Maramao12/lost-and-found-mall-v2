/* =====================================================================
   src/validators/utilisateur.validator.js
   ---------------------------------------------------------------------
   Schémas Zod du domaine "utilisateurs". Utilisés avec le middleware
   validate(schema) : le contrôleur reçoit des données propres.
   .strict() = toute clé inconnue est REFUSÉE (ex : un client qui envoie
   "role": "ADMIN" à l'inscription reçoit une erreur 400).
   ===================================================================== */

const { z } = require("zod");
const { ROLES } = require("../constants/enums");

// ---------- Briques réutilisables ----------
function nomPropre(libelle) {
  return z
    .string({ required_error: libelle + " obligatoire", invalid_type_error: libelle + " invalide" })
    .trim()
    .min(2, libelle + " : 2 caractères minimum")
    .max(60, libelle + " : 60 caractères maximum");
}

const email = z
  .string({ required_error: "Email obligatoire", invalid_type_error: "Email invalide" })
  .trim()
  .toLowerCase()
  .email("Email invalide")
  .max(120, "Email : 120 caractères maximum");

// bcrypt ne lit que les 72 premiers octets : on plafonne donc à 72.
const motDePasse = z
  .string({ required_error: "Mot de passe obligatoire", invalid_type_error: "Mot de passe invalide" })
  .min(8, "Mot de passe : 8 caractères minimum")
  .max(72, "Mot de passe : 72 caractères maximum")
  .regex(/[A-Za-z]/, "Le mot de passe doit contenir au moins une lettre")
  .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre");

// "" est accepté : il sert à EFFACER le numéro
const telephone = z
  .string({ invalid_type_error: "Téléphone invalide" })
  .trim()
  .transform(function (v) { return v.replace(/[\s.-]/g, ""); })
  .refine(function (v) { return v === "" || /^\+?[0-9]{8,15}$/.test(v); }, "Numéro de téléphone invalide");

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Identifiant invalide");

function auMoinsUnChamp(objet) {
  return Object.keys(objet).length > 0;
}

// ---------- Authentification ----------
const registerSchema = z.object({
  nom: nomPropre("Nom"),
  prenom: nomPropre("Prénom"),
  email: email,
  motDePasse: motDePasse,
  telephone: telephone.optional()
}).strict();

const loginSchema = z.object({
  email: email,
  motDePasse: z.string({ required_error: "Mot de passe obligatoire" }).min(1, "Mot de passe obligatoire").max(72)
}).strict();

// ---------- Profil (utilisateur connecté) ----------
const updateProfileSchema = z.object({
  nom: nomPropre("Nom").optional(),
  prenom: nomPropre("Prénom").optional(),
  telephone: telephone.optional()
}).strict().refine(auMoinsUnChamp, "Aucune modification fournie");

const changePasswordSchema = z.object({
  motDePasseActuel: z.string({ required_error: "Mot de passe actuel obligatoire" }).min(1, "Mot de passe actuel obligatoire").max(72),
  nouveauMotDePasse: motDePasse
}).strict().refine(function (d) { return d.motDePasseActuel !== d.nouveauMotDePasse; }, {
  path: ["nouveauMotDePasse"],
  message: "Le nouveau mot de passe doit être différent de l'ancien"
});

const deleteAccountSchema = z.object({
  motDePasse: z.string({ required_error: "Mot de passe obligatoire" }).min(1, "Mot de passe obligatoire").max(72)
}).strict();

// ---------- Administration ----------
const adminCreateSchema = z.object({
  nom: nomPropre("Nom"),
  prenom: nomPropre("Prénom"),
  email: email,
  motDePasse: motDePasse,
  telephone: telephone.optional(),
  role: z.enum(ROLES).default("MEMBRE")
}).strict();

const adminUpdateSchema = z.object({
  nom: nomPropre("Nom").optional(),
  prenom: nomPropre("Prénom").optional(),
  email: email.optional(),
  telephone: telephone.optional(),
  role: z.enum(ROLES).optional(),
  actif: z.boolean({ invalid_type_error: "actif doit être true ou false" }).optional(),
  motDePasse: motDePasse.optional()          // réinitialisation par l'admin
}).strict().refine(auMoinsUnChamp, "Aucune modification fournie");

const idParamsSchema = z.object({ id: objectId });

// ?page=1&limit=10&role=ADMIN&actif=true&q=amine
const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  role: z.enum(ROLES).optional(),
  actif: z.enum(["true", "false"]).transform(function (v) { return v === "true"; }).optional(),
  q: z.string().trim().min(1).max(80).optional()
});

module.exports = {
  registerSchema, loginSchema,
  updateProfileSchema, changePasswordSchema, deleteAccountSchema,
  adminCreateSchema, adminUpdateSchema, idParamsSchema, listQuerySchema
};