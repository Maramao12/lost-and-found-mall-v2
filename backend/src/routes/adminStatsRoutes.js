/* =====================================================================
   src/routes/adminStatsRoutes.js   ->   /api/admin/stats
   Réservé aux ADMIN.
   ===================================================================== */

const express = require("express");
const { authenticate, authorize } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const asyncHandler = require("../utils/asyncHandler");
const ctrl = require("../controllers/statsController");
const { evolutionQuerySchema } = require("../validators/statsValidator");

const router = express.Router();

router.use(authenticate, authorize("ADMIN"));

router.get("/overview", asyncHandler(ctrl.overview));
router.get(
  "/evolution",
  validate(evolutionQuerySchema, "query"),
  asyncHandler(ctrl.evolution),
);
router.get("/par-zone", asyncHandler(ctrl.parZone));
router.get("/par-categorie", asyncHandler(ctrl.parCategorie));
router.get("/export", asyncHandler(ctrl.exportCsv));

module.exports = router;
