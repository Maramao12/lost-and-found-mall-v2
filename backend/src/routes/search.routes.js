const express = require("express");
const { authenticate, authorize } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const asyncHandler = require("../utils/asyncHandler");
const ctrl = require("../controllers/search.controller");
const { searchQuerySchema } = require("../validators/searchValidator");
const {
  referenceSearchQuerySchema,
} = require("../validators/referenceSearchValidator");
const {
  memberHistoryQuerySchema,
} = require("../validators/memberHistoryValidator");

const router = express.Router();

// Toutes les routes exigent d'être connecté
router.use(authenticate);

// Historique du membre connecté (ses propres déclarations uniquement)
router.get(
  "/me/declarations",
  validate(memberHistoryQuerySchema, "query"),
  asyncHandler(ctrl.mesDeclarations),
);

// Recherches réservées à l'administrateur
router.get(
  "/",
  authorize("ADMIN"),
  validate(searchQuerySchema, "query"),
  asyncHandler(ctrl.search),
);
router.get(
  "/categories",
  authorize("ADMIN"),
  validate(referenceSearchQuerySchema, "query"),
  asyncHandler(ctrl.categories),
);
router.get(
  "/zones",
  authorize("ADMIN"),
  validate(referenceSearchQuerySchema, "query"),
  asyncHandler(ctrl.zones),
);

module.exports = router;
