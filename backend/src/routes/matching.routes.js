/* =====================================================================
   Routes API : Matching IA + Vérification des correspondances
   ===================================================================== */

const express = require("express");
const { z } = require("zod");
const router = express.Router();
const { authenticate } = require("../middlewares/auth");
router.use(authenticate);
const controller = require("../controllers/matching.controller");
const {
  getCorrespondanceById,
  envoyerPreuve,
  demanderVerification,
  repondreVerification,
  accepterCorrespondance,
  refuserCorrespondance,
  confirmerRestitution,
} = require("../controllers/correspondance.controller");

// ---------- Matching IA ----------
// Lancer l'analyse IA pour une déclaration (Top 3 >= 50%)
router.post(
  "/analyser/:declarationId",
  controller.lancerMatchingPourDeclaration,
);

// Afficher les correspondances trouvées pour une déclaration
router.get(
  "/declaration/:declarationId",
  controller.getCorrespondancesParDeclaration,
);

// ---------- Schémas Zod ----------
const idParamSchema = z.object({
  id: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Identifiant de correspondance invalide"),
});
const preuveSchema = z.object({
  preuveProprietaire: z
    .string({ required_error: "La preuve est obligatoire" })
    .trim()
    .min(3, "Décrivez un détail privé (min. 3 caractères)")
    .max(500),
});
const questionSchema = z.object({
  questionVerification: z
    .string({ required_error: "La question est obligatoire" })
    .trim()
    .min(3, "Posez une question précise (min. 3 caractères)")
    .max(500),
});
const reponseSchema = z.object({
  reponseVerification: z
    .string({ required_error: "La réponse est obligatoire" })
    .trim()
    .min(2, "Veuillez saisir votre réponse")
    .max(500),
});
const refusSchema = z.object({
  motifRefus: z
    .string()
    .trim()
    .min(3, "Le motif doit contenir au moins 3 caractères")
    .max(300)
    .optional(),
});

// Middleware de validation : vérifie les paramètres de l'URL et le body
function valider(paramSchema, bodySchema) {
  return (req, res, next) => {
    if (paramSchema) {
      const p = paramSchema.safeParse(req.params);
      if (!p.success)
        return res
          .status(400)
          .json({ success: false, message: p.error.issues[0].message });
    }
    if (bodySchema) {
      const b = bodySchema.safeParse(req.body || {});
      if (!b.success)
        return res
          .status(400)
          .json({ success: false, message: b.error.issues[0].message });
      req.body = b.data;
    }
    next();
  };
}

// ---------- Vérification des correspondances ----------
// (toujours placées APRÈS les routes IA, à cause de "/:id")
router.get("/:id", valider(idParamSchema, null), getCorrespondanceById);
router.patch(
  "/:id/preuve",
  valider(idParamSchema, preuveSchema),
  envoyerPreuve,
);
router.patch(
  "/:id/demander-verification",
  valider(idParamSchema, questionSchema),
  demanderVerification,
);
router.patch(
  "/:id/repondre",
  valider(idParamSchema, reponseSchema),
  repondreVerification,
);
router.patch(
  "/:id/refuser",
  valider(idParamSchema, refusSchema),
  refuserCorrespondance,
);
router.patch(
  "/:id/accepter",
  valider(idParamSchema, null),
  accepterCorrespondance,
);
router.patch(
  "/:id/restituer",
  valider(idParamSchema, null),
  confirmerRestitution,
);

module.exports = router;
