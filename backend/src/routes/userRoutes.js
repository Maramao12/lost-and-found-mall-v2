/* =====================================================================
   src/routes/users.routes.js   ->  monté sur /api/users
   ---------------------------------------------------------------------
   - /me...  : tout utilisateur connecté (son propre profil)
   - le reste : ADMIN uniquement
   ATTENTION : les routes "/me" doivent rester AVANT "/:id".
   ===================================================================== */

const express = require("express");
const validate = require("../middlewares/validate");
const asyncHandler = require("../utils/asyncHandler");
const { authenticate, authorize } = require("../middlewares/auth");
const schemas = require("../validators/userValidator");
const controller = require("../controllers/userController");

const router = express.Router();

// Toutes les routes ci-dessous exigent un jeton valide
router.use(authenticate);

// ----- Profil (membre ou admin) -----
router.get("/me", controller.getMe);
router.patch(
  "/me",
  validate(schemas.updateProfileSchema),
  asyncHandler(controller.updateMe),
);
router.patch(
  "/me/password",
  validate(schemas.changePasswordSchema),
  asyncHandler(controller.changePassword),
);
router.delete(
  "/me",
  validate(schemas.deleteAccountSchema),
  asyncHandler(controller.deleteMe),
);

// ----- Administration : tout ce qui suit est réservé aux ADMIN -----
router.use(authorize("ADMIN"));

router.get(
  "/",
  validate(schemas.listQuerySchema, "query"),
  asyncHandler(controller.list),
);
router.post(
  "/",
  validate(schemas.adminCreateSchema),
  asyncHandler(controller.create),
);
router.get(
  "/:id",
  validate(schemas.idParamsSchema, "params"),
  asyncHandler(controller.getOne),
);
router.patch(
  "/:id",
  validate(schemas.idParamsSchema, "params"),
  validate(schemas.adminUpdateSchema),
  asyncHandler(controller.update),
);
router.delete(
  "/:id",
  validate(schemas.idParamsSchema, "params"),
  asyncHandler(controller.remove),
);

module.exports = router;
