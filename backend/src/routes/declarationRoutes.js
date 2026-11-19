/* =====================================================================
   src/routes/declarationRoutes.js   ->   /api/declarations
   ---------------------------------------------------------------------
   Toutes les routes exigent d'être connecté (authenticate).
   ATTENTION À L'ORDRE : "/me" doit être déclaré AVANT "/:id", sinon
   Express croirait que "me" est un identifiant.
   ===================================================================== */

const express = require("express");

const { authenticate } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const asyncHandler = require("../utils/asyncHandler");
const ctrl = require("../controllers/declarationController");
const {
  createDeclarationSchema,
  updateDeclarationSchema,
  changeStatusSchema,
  deleteDeclarationSchema,
  idParamsSchema,
  listMineQuerySchema,
} = require("../validators/declarationValidator");

const router = express.Router();

router.use(authenticate);

// Créer une déclaration (PERDU ou TROUVE)
router.post("/", validate(createDeclarationSchema), asyncHandler(ctrl.create));

// Mes déclarations (paginées)
router.get(
  "/me",
  validate(listMineQuerySchema, "query"),
  asyncHandler(ctrl.listMine),
);

// Détail
router.get(
  "/:id",
  validate(idParamsSchema, "params"),
  asyncHandler(ctrl.getOne),
);

// Modifier (auteur)
router.patch(
  "/:id",
  validate(idParamsSchema, "params"),
  validate(updateDeclarationSchema),
  asyncHandler(ctrl.update),
);

// Changer le statut (auteur ou admin)
router.patch(
  "/:id/statut",
  validate(idParamsSchema, "params"),
  validate(changeStatusSchema),
  asyncHandler(ctrl.changeStatus),
);

// Supprimer (suppression logique ; auteur ou admin)
router.delete(
  "/:id",
  validate(idParamsSchema, "params"),
  validate(deleteDeclarationSchema),
  asyncHandler(ctrl.remove),
);

module.exports = router;
