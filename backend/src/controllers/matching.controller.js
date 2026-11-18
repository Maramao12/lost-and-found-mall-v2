/* =====================================================================
   src/controllers/matching.controller.js
   Algorithme de Matching IA (Partie Molka) :
   - Compare une déclaration avec les déclarations opposées publiées
   - Filtre les scores >= 0.50 et garde le Top 3
   - Enregistre dans analyses_matching et correspondances
   ===================================================================== */

const Declaration = require("../models/Declaration");
const AnalyseMatching = require("../models/AnalyseMatching");
const Correspondance = require("../models/Correspondance");
const { analyserPaireDeclarations } = require("../services/aiMatching.service");

const SEUIL_MINIMUM = 0.5; // Score minimum de 50 %
const MAX_PROPOSITIONS = 3; // Top 3 maximum

// POST /api/correspondances/analyser/:declarationId
async function lancerMatchingPourDeclaration(req, res, next) {
  try {
    const { declarationId } = req.params;
    const declarationSource = await Declaration.findById(declarationId);

    if (!declarationSource || declarationSource.statut !== "PUBLIEE") {
      return res.status(404).json({
        success: false,
        message: "Déclaration introuvable ou non publiée.",
      });
    }

    // Si l'objet est PERDU, on cherche dans TROUVE (et inversement)
    const typeOppose = declarationSource.type === "PERDU" ? "TROUVE" : "PERDU";
    const candidates = await Declaration.find({
      type: typeOppose,
      statut: "PUBLIEE",
      auteurId: { $ne: declarationSource.auteurId },
    });

    const resultatsValides = [];

    for (const candidate of candidates) {
      const decPerdue =
        declarationSource.type === "PERDU" ? declarationSource : candidate;
      const decTrouvee =
        declarationSource.type === "TROUVE" ? declarationSource : candidate;

      const scores = await analyserPaireDeclarations(decPerdue, decTrouvee);

      if (scores.scoreGlobal >= SEUIL_MINIMUM) {
        resultatsValides.push({
          decPerdueId: decPerdue._id,
          decTrouveeId: decTrouvee._id,
          scores,
        });
      }
    }

    // Trier du plus grand score au plus petit et garder le Top 3
    resultatsValides.sort(
      (a, b) => b.scores.scoreGlobal - a.scores.scoreGlobal,
    );
    const top3 = resultatsValides.slice(0, MAX_PROPOSITIONS);

    const correspondancesEnregistrees = [];

    for (const item of top3) {
      // 1. Enregistrer les 5 scores détaillés dans analyses_matching
      const analyse = await AnalyseMatching.create({
        scorePhoto: item.scores.scorePhoto,
        scoreTexte: item.scores.scoreTexte,
        scoreLieu: item.scores.scoreLieu,
        scoreDate: item.scores.scoreDate,
        scoreCategorie: item.scores.scoreCategorie,
        modeleImage: item.scores.modeleImage,
        modeleTexte: item.scores.modeleTexte,
      });

      // 2. Créer ou mettre à jour la correspondance
      let corr = await Correspondance.findOne({
        declarationPerdueId: item.decPerdueId,
        declarationTrouveeId: item.decTrouveeId,
      });

      if (corr) {
        corr.analyseId = analyse._id;
        corr.scoreGlobal = item.scores.scoreGlobal;
        corr.dateMiseAJour = new Date();
        await corr.save();
      } else {
        corr = await Correspondance.create({
          declarationPerdueId: item.decPerdueId,
          declarationTrouveeId: item.decTrouveeId,
          analyseId: analyse._id,
          scoreGlobal: item.scores.scoreGlobal,
          statut: "PROPOSEE",
        });
      }

      correspondancesEnregistrees.push(corr);
    }

    return res.status(200).json({
      success: true,
      totalCandidatesAnalysees: candidates.length,
      propositionsRetenues: correspondancesEnregistrees.length,
      data: correspondancesEnregistrees,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/correspondances/declaration/:declarationId
async function getCorrespondancesParDeclaration(req, res, next) {
  try {
    const { declarationId } = req.params;

    const correspondances = await Correspondance.find({
      $or: [
        { declarationPerdueId: declarationId },
        { declarationTrouveeId: declarationId },
      ],
    })
      .populate("declarationPerdueId", "titre description photoUrl statut")
      .populate("declarationTrouveeId", "titre description photoUrl statut")
      .populate("analyseId")
      .sort({ scoreGlobal: -1 });

    return res.json({
      success: true,
      count: correspondances.length,
      data: correspondances,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  lancerMatchingPourDeclaration,
  getCorrespondancesParDeclaration,
};
