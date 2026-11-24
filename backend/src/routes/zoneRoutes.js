/* =====================================================================
   src/routes/zoneRoutes.js   ->   /api/zones
   ===================================================================== */

const express = require("express");

const { authenticate, authorize } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const asyncHandler = require("../utils/asyncHandler");
const ctrl = require("../controllers/zoneController");
const {
  createZoneSchema,
  updateZoneSchema,
  idParamsSchema,
} = require("../validators/zoneValidator");

const router = express.Router();

router.use(authenticate);

// Lecture : tout utilisateur connecté
router.get("/", asyncHandler(ctrl.list));
router.get(
  "/:id",
  validate(idParamsSchema, "params"),
  asyncHandler(ctrl.getOne),
);

// Écriture : administrateur seulement
router.post(
  "/",
  authorize("ADMIN"),
  validate(createZoneSchema),
  asyncHandler(ctrl.create),
);
router.patch(
  "/:id",
  authorize("ADMIN"),
  validate(idParamsSchema, "params"),
  validate(updateZoneSchema),
  asyncHandler(ctrl.update),
);
router.delete(
  "/:id",
  authorize("ADMIN"),
  validate(idParamsSchema, "params"),
  asyncHandler(ctrl.remove),
);

module.exports = router;
