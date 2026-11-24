/* =====================================================================
   src/routes/index.js
   ---------------------------------------------------------------------
   ROUTEUR CENTRAL. Toutes les routes de l'API passent par ici, sous le
   préfixe /api (défini dans app.js).
   ===================================================================== */

const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

// ---------------------------------------------------------------------
// Route de test : GET /api/health
// Vérifie que le serveur tourne et que MongoDB est connecté.
// ---------------------------------------------------------------------
router.get("/health", function (req, res) {
  const etats = ["disconnected", "connected", "connecting", "disconnecting"];

  res.json({
    success: true,
    status: "ok",
    db: etats[mongoose.connection.readyState],
  });
});

// ---------------------------------------------------------------------
// ROUTES DES BINÔMES
// ---------------------------------------------------------------------

// Binôme 1 : utilisateurs, déclarations et sécurité
router.use("/auth", require("./authRoutes"));
router.use("/users", require("./userRoutes"));
router.use("/declarations", require("./declarationRoutes"));
router.use("/categories", require("./categorieRoutes"));
router.use("/zones", require("./zoneRoutes"));

// Binôme 2 : recherche
router.use("/search", require("./search.routes"));

// Binôme 3 : matching et correspondances
router.use("/correspondances", require("./matching.routes"));

// Binôme 4 : administration et signalements
router.use("/admin/stats", require("./adminStatsRoutes"));
router.use("/admin", require("./admin.routes"));
router.use("/signalements", require("./signalement.routes"));

module.exports = router;
