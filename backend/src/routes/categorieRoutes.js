/* =====================================================================
   src/routes/categorieRoutes.js   ->   /api/categories
   - GET : tout utilisateur connecté
   - POST / PATCH / DELETE : ADMIN seulement
   ===================================================================== */

const express = require("express");
const { authenticate, authorize } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const asyncHandler = require("../utils/asyncHandler");
const ctrl = require("../controllers/categorieController");
const {
  createCategorieSchema,
  updateCategorieSchema,
  idParamsSchema,
} = require("../validators/categorieValidator");

const router = express.Router();

router.use(authenticate);

router.get("/", asyncHandler(ctrl.list));
router.get(
  "/:id",
  validate(idParamsSchema, "params"),
  asyncHandler(ctrl.getOne),
);

router.post(
  "/",
  authorize("ADMIN"),
  validate(createCategorieSchema),
  asyncHandler(ctrl.create),
);
router.patch(
  "/:id",
  authorize("ADMIN"),
  validate(idParamsSchema, "params"),
  validate(updateCategorieSchema),
  asyncHandler(ctrl.update),
);
router.delete(
  "/:id",
  authorize("ADMIN"),
  validate(idParamsSchema, "params"),
  asyncHandler(ctrl.remove),
);

module.exports = router;
