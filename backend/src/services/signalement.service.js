/* =====================================================================
   src/services/signalement.service.js

   Logique métier de la création d'un signalement par un membre.
   ===================================================================== */

const Signalement = require("../models/Signalement");
const Declaration = require("../models/Declaration");
const AppError = require("../utils/AppError");

// ---------------------------------------------------------------------
// Créer un signalement
// ---------------------------------------------------------------------
async function creerSignalement({
  declarationId,
  motif,
  description,
  membreId,
}) {
  // 1. Vérifier que la déclaration existe
  const declaration = await Declaration.findById(declarationId);

  if (!declaration) {
    throw new AppError(
      404,
      "DECLARATION_NOT_FOUND",
      "La déclaration signalée est introuvable",
    );
  }

  // 2. Empêcher le membre de signaler sa propre déclaration
  if (declaration.auteurId.toString() === membreId.toString()) {
    throw new AppError(
      403,
      "OWN_DECLARATION_REPORT",
      "Vous ne pouvez pas signaler votre propre déclaration",
    );
  }

  // 3. Vérifier si ce membre a déjà signalé cette déclaration
  const signalementExistant = await Signalement.findOne({
    declarationId,
    membreId,
  });

  if (signalementExistant) {
    throw new AppError(
      409,
      "REPORT_ALREADY_EXISTS",
      "Vous avez déjà signalé cette déclaration",
    );
  }

  // 4. Créer le signalement
  const nouveauSignalement = await Signalement.create({
    declarationId,
    membreId,
    motif,
    description,
  });

  // 5. Retourner le signalement créé
  return nouveauSignalement;
}

// ---------------------------------------------------------------------
// Exportation
// ---------------------------------------------------------------------
module.exports = {
  creerSignalement,
};
