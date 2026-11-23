/* =====================================================================
   src/controllers/signalement.controller.js

   Controller de la création des signalements par les membres.
   ===================================================================== */

const signalementService = require("../services/signalement.service");
const asyncHandler = require("../utils/asyncHandler");

// ---------------------------------------------------------------------
// Créer un signalement
// POST /api/signalements
// ---------------------------------------------------------------------
exports.creerSignalement = asyncHandler(async (req, res) => {
  // 1. Récupérer les données validées du body
  const { declarationId, motif, description } = req.body;

  // 2. Récupérer l'identifiant du membre connecté
  const membreId = req.user._id;

  // 3. Appeler le service pour appliquer les règles métier
  const signalement = await signalementService.creerSignalement({
    declarationId,
    motif,
    description,
    membreId,
  });

  // 4. Retourner la réponse HTTP
  res.status(201).json({
    success: true,
    message: "Signalement créé avec succès",
    data: signalement,
  });
});
