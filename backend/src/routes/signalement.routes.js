/* =====================================================================
   src/routes/signalement.routes.js

   Routes pour la création des signalements par les membres.
   ===================================================================== */

const express = require("express");
const router = express.Router();

// Middleware d'authentification
const { authenticate } = require("../middlewares/auth");

// Middleware de validation
const validate = require("../middlewares/validate");
const {
  creerSignalementSchema,
} = require("../validators/signalementValidator");

// Controller
const signalementController = require("../controllers/signalement.controller");

// ---------------------------------------------------------------------
// POST /api/signalements
// Membre connecté : créer un signalement
// ---------------------------------------------------------------------
router.post(
  "/",
  authenticate,
  validate(creerSignalementSchema),
  signalementController.creerSignalement,
);

module.exports = router;
