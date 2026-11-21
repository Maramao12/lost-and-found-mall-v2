const express = require("express");
const { authenticate, authorize } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const asyncHandler = require("../utils/asyncHandler");
const ctrl = require("../controllers/search.controller");
const { searchQuerySchema } = require("../validators/searchValidator");

const router = express.Router();

// Pas de recherche publique : il faut être connecté ET administrateur
router.use(authenticate, authorize("ADMIN"));

// GET /api/search?q=sac&type=TROUVE&page=1&limit=10
router.get(
  "/",
  validate(searchQuerySchema, "query"),
  asyncHandler(ctrl.search),
);

module.exports = router;
