/* =====================================================================
   src/routes/matching.routes.js
   Routes API Matching IA (Partie Molka)
   ===================================================================== */

const express = require("express");
const router = express.Router();
const controller = require("../controllers/matching.controller");

// Lancer l'analyse IA pour une déclaration (Top 3 >= 50%)
router.post(
  "/analyser/:declarationId",
  controller.lancerMatchingPourDeclaration,
);

// Afficher les correspondances trouvées pour une déclaration
router.get(
  "/declaration/:declarationId",
  controller.getCorrespondancesParDeclaration,
);

module.exports = router;
