/* =====================================================================
   src/routes/adminRoutes.js
   ---------------------------------------------------------------------
   Routes administration - Personne 1

   Toutes les routes sont protégées par :
   1. authenticate
   2. authorize("ADMIN")
   ===================================================================== */

const express = require("express");

const { authenticate, authorize } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const asyncHandler = require("../utils/asyncHandler");

const ctrl = require("../controllers/admin.controller");
const {
  usersQuerySchema,
  userIdSchema,
  userStatusSchema,
} = require("../schemas/admin.schema");

const {
  listReportsSchema,
  reportIdSchema,
  resolveReportSchema,
  listDeclarationsSchema,
  moderationSchema,
} = require("../validators/adminValidator");

const router = express.Router();

// ---------------------------------------------------------------------
// PROTECTION GENERALE
// Toutes les routes de ce router exigent un admin connecté
// ---------------------------------------------------------------------
router.use(authenticate);
router.use(authorize("ADMIN"));

// =====================================================================
// SIGNALEMENTS
// =====================================================================

// F1 + F2 : liste et filtres
router.get(
  "/reports",
  validate(listReportsSchema, "query"),
  asyncHandler(ctrl.listReports),
);

// F3 : détails
router.get(
  "/reports/:id",
  validate(reportIdSchema, "params"),
  asyncHandler(ctrl.getReport),
);

// F4 + F5 : traitement
router.patch(
  "/reports/:id/resolve",
  validate(reportIdSchema, "params"),
  validate(resolveReportSchema),
  asyncHandler(ctrl.resolveReport),
);

// =====================================================================
// MODERATION DES DECLARATIONS
// =====================================================================

// F6 + F7 : liste et filtres
router.get(
  "/declarations",
  validate(listDeclarationsSchema, "query"),
  asyncHandler(ctrl.listDeclarations),
);

// F8 + F9 + F10 + F11 : masquer/restaurer
router.patch(
  "/declarations/:id/moderation",
  validate(reportIdSchema, "params"),
  validate(moderationSchema),
  asyncHandler(ctrl.moderateDeclaration),
);
// =====================================================================
// GESTION DES UTILISATEURS
// =====================================================================

// F12 : Liste des utilisateurs
router.get(
  "/users",
  validate(usersQuerySchema, "query"),
  asyncHandler(ctrl.listUsers),
);

// F13 : Suspendre ou réactiver un utilisateur
router.patch(
  "/users/:id/status",
  validate(userIdSchema, "params"),
  validate(userStatusSchema),
  asyncHandler(ctrl.updateUserStatus),
);

module.exports = router;
