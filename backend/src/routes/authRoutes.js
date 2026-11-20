/* =====================================================================
   src/routes/auth.routes.js   ->  monté sur /api/auth
   ===================================================================== */

const express = require("express");
const validate = require("../middlewares/validate");
const asyncHandler = require("../utils/asyncHandler");
const { authenticate } = require("../middlewares/auth");
const { authLimiter } = require("../middlewares/rateLimiter");
const { registerSchema, loginSchema } = require("../validators/userValidator");
const controller = require("../controllers/authController");

const router = express.Router();

// Ordre : limiteur -> validation Zod -> contrôleur
router.post("/register", authLimiter, validate(registerSchema), asyncHandler(controller.register));
router.post("/login", authLimiter, validate(loginSchema), asyncHandler(controller.login));
router.get("/me", authenticate, controller.me);

module.exports = router;