/* =====================================================================
   src/routes/adminDeclarationRoutes.js   ->   /api/admin/declarations
   Réservé aux ADMIN.
   ===================================================================== */

const express = require("express");
const { authenticate, authorize } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const asyncHandler = require("../utils/asyncHandler");
const ctrl = require("../controllers/adminDeclarationController");
const { listQuerySchema } = require("../validators/adminDeclarationValidator");

const router = express.Router();

router.use(authenticate, authorize("ADMIN"));

router.get("/", validate(listQuerySchema, "query"), asyncHandler(ctrl.list));

module.exports = router;
