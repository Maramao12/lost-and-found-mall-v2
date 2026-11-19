/* =====================================================================
   src/controllers/matching.controller.js
   Algorithme de Matching IA (Partie Molka) :
   - Compare une déclaration avec les déclarations opposées publiées
   - Filtre les scores >= 0.50 et garde le Top 3
   - Enregistre dans analyses_matching et correspondances
   - Envoie automatiquement les notifications aux 2 membres concernés
   ===================================================================== */

const Declaration = require("../models/Declaration");
const AnalyseMatching = require("../models/AnalyseMatching");
const Correspondance = require("../models/Correspondance");
const Notification = require("../models/Notification");
const { analyserPaireDeclarations } = require("../services/aiMatching.service");

const SEUIL_MINIMUM = 0.5; // Score minimum de 50 %
const MAX_PROPOSITIONS = 3; // Top 3 maximum

// Fonction réutilisable (appelée par la route Postman ET automatiquement à la création)
async function executerMatchingPourDeclaration(declarationId) {
  const declarationSource = await Declaration.findById(declarationId);

  if (!declarationSource || declarationSource.statut !== "PUBLIEE") {
    return null;
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
        decPerdue,
        decTrouvee,
        scores,
      });
    }
  }

  // Trier du plus grand score au plus petit et garder le Top 3
  resultatsValides.sort((a, b) => b.scores.scoreGlobal - a.scores.scoreGlobal);
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
      declarationPerdueId: item.decPerdue._id,
      declarationTrouveeId: item.decTrouvee._id,
    });

    if (corr) {
      corr.analyseId = analyse._id;
      corr.scoreGlobal = item.scores.scoreGlobal;
      corr.dateMiseAJour = new Date();
      await corr.save();
    } else {
      corr = await Correspondance.create({
        declarationPerdueId: item.decPerdue._id,
        declarationTrouveeId: item.decTrouvee._id,
        analyseId: analyse._id,
        scoreGlobal: item.scores.scoreGlobal,
        statut: "PROPOSEE",
      });

      // 3. Créer les notifications automatiques pour les 2 utilisateurs
      const pourcentage = Math.round(item.scores.scoreGlobal * 100);

      await Notification.insertMany([
        {
          utilisateurId: item.decPerdue.auteurId,
          titre: "Nouvelle correspondance détectée !",
          message: `Un objet trouvé ("${item.decTrouvee.titre}") correspond à ${pourcentage}% à votre déclaration "${item.decPerdue.titre}".`,
          type: "NOUVELLE_CORRESPONDANCE",
        },
        {
          utilisateurId: item.decTrouvee.auteurId,
          titre: "Correspondance trouvée pour votre annonce !",
          message: `Votre objet trouvé ("${item.decTrouvee.titre}") correspond à ${pourcentage}% à l'objet perdu "${item.decPerdue.titre}".`,
          type: "NOUVELLE_CORRESPONDANCE",
        },
      ]);
    }

    correspondancesEnregistrees.push(corr);
  }

  return {
    totalCandidatesAnalysees: candidates.length,
    propositionsRetenues: correspondancesEnregistrees.length,
    data: correspondancesEnregistrees,
  };
}

// POST /api/correspondances/analyser/:declarationId
async function lancerMatchingPourDeclaration(req, res, next) {
  try {
    const resultat = await executerMatchingPourDeclaration(
      req.params.declarationId,
    );

    if (!resultat) {
      return res.status(404).json({
        success: false,
        message: "Déclaration introuvable ou non publiée.",
      });
    }

    return res.status(200).json({
      success: true,
      ...resultat,
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
  executerMatchingPourDeclaration,
  lancerMatchingPourDeclaration,
  getCorrespondancesParDeclaration,
};
