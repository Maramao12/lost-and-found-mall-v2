const express = require("express");
const { authenticate, authorize } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const asyncHandler = require("../utils/asyncHandler");
const ctrl = require("../controllers/search.controller");
const { searchQuerySchema } = require("../validators/searchValidator");
const {
  referenceSearchQuerySchema,
} = require("../validators/referenceSearchValidator");

const router = express.Router();

// Pas de recherche publique : il faut être connecté ET administrateur
router.use(authenticate, authorize("ADMIN"));

// GET /api/search?q=sac&type=TROUVE&page=1&limit=10
router.get(
  "/",
  validate(searchQuerySchema, "query"),
  asyncHandler(ctrl.search),
);

// GET /api/search/categories?q=sac&sort=nom_desc&page=1&limit=10
router.get(
  "/categories",
  validate(referenceSearchQuerySchema, "query"),
  asyncHandler(ctrl.categories),
);

// GET /api/search/zones?q=food&sort=nom_asc&page=1&limit=10
router.get(
  "/zones",
  validate(referenceSearchQuerySchema, "query"),
  asyncHandler(ctrl.zones),
);

module.exports = router;
