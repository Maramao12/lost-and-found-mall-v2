/* =====================================================================
   src/routes/index.js
   ---------------------------------------------------------------------
   ROUTEUR CENTRAL. Toutes les routes de l'API passent par ici, sous le
   préfixe /api (défini dans app.js).

   RÈGLE D'ÉQUIPE : chaque binôme ajoute UNE ligne (la sienne) dans la
   zone "ROUTES DES BINÔMES". Ne touchez pas aux lignes des autres :
   cela évite les conflits git.
   ===================================================================== */

const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

// ---------------------------------------------------------------------
// Route de test : GET /api/health
// Vérifie que le serveur tourne et que MongoDB est connecté.
// readyState : 0 déconnecté, 1 connecté, 2 en connexion, 3 déconnexion
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
// ROUTES DES BINÔMES (décommentez / ajoutez votre ligne quand votre
// fichier de routes existe)
// ---------------------------------------------------------------------
// Binôme 1 : utilisateurs, déclarations, sécurité
router.use("/auth", require("./authRoutes"));
router.use("/users", require("./userRoutes"));
router.use("/declarations", require("./declarationRoutes"));
router.use("/categories", require("./categorieRoutes"));
router.use("/zones", require("./zoneRoutes"));

// Binôme 2 : recherche
router.use("/search", require("./search.routes"));

// Binôme 3 : matching et correspondances
router.use("/correspondances", require("./matching.routes"));

// Binôme 4 : administration, signalements, statistiques
// router.use("/admin", require("./admin.routes"));

module.exports = router;

