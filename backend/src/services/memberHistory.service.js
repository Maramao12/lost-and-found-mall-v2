/* ============================================================
 * src/services/memberHistory.service.js
 *
 * Recherche et filtrage des déclarations du membre connecté.
 * IMPORTANT : memberId doit provenir de l'utilisateur connecté.
 * Les déclarations SUPPRIMEE sont exclues de l'historique.
 * ============================================================ */

const mongoose = require("mongoose");
const Declaration = require("../models/Declaration");
const AppError = require("../utils/AppError");

// Échappe les caractères spéciaux d'une expression régulière.
function echapperRegex(texte) {
  return texte.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Vérifie et convertit une date au format YYYY-MM-DD.
// Si finDeJournee vaut true, toute la journée est incluse.
function convertirDate(valeur, nomChamp, finDeJournee = false) {
  if (valeur === undefined || valeur === null || valeur === "") {
    return null;
  }

  if (typeof valeur !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valeur)) {
    throw new AppError(
      400,
      "INVALID_DATE",
      `${nomChamp} doit respecter le format YYYY-MM-DD.`,
    );
  }

  const [annee, mois, jour] = valeur.split("-").map(Number);

  const date = finDeJournee
    ? new Date(annee, mois - 1, jour, 23, 59, 59, 999)
    : new Date(annee, mois - 1, jour, 0, 0, 0, 0);

  // Vérifie que la date existe réellement.
  if (
    date.getFullYear() !== annee ||
    date.getMonth() !== mois - 1 ||
    date.getDate() !== jour
  ) {
    throw new AppError(
      400,
      "INVALID_DATE",
      `${nomChamp} n'est pas une date valide.`,
    );
  }

  return date;
}

// Vérifie et convertit un identifiant MongoDB.
function convertirObjectId(valeur, nomChamp) {
  if (!mongoose.Types.ObjectId.isValid(valeur)) {
    throw new AppError(400, "INVALID_ID", `${nomChamp} est invalide.`);
  }

  return new mongoose.Types.ObjectId(valeur);
}

// Construit les filtres de l'historique.
function construireFiltresHistorique(filtres = {}, memberId) {
  if (!memberId || !mongoose.Types.ObjectId.isValid(memberId)) {
    throw new AppError(
      400,
      "INVALID_MEMBER_ID",
      "L'identifiant du membre est invalide.",
    );
  }

  // Le membre ne peut consulter que ses propres déclarations.
  // Les déclarations supprimées sont toujours exclues.
  const query = {
    auteurId: new mongoose.Types.ObjectId(memberId),
    statut: { $ne: "SUPPRIMEE" },
  };

  // Recherche textuelle dans titre et description.
  if (filtres.keyword && filtres.keyword.trim()) {
    query.$text = {
      $search: filtres.keyword.trim(),
      $language: "french",
    };
  }

  // Filtre par type.
  if (filtres.type) {
    if (!["PERDU", "TROUVE"].includes(filtres.type)) {
      throw new AppError(
        400,
        "INVALID_TYPE",
        "Le type doit être PERDU ou TROUVE.",
      );
    }

    query.type = filtres.type;
  }

  // Filtre par statut : SUPPRIMEE n'est pas autorisé.
  if (filtres.statut) {
    const statutsAutorises = ["PUBLIEE", "EN_COURS", "RESTITUEE"];

    if (!statutsAutorises.includes(filtres.statut)) {
      throw new AppError(
        400,
        "INVALID_STATUS",
        "Statut invalide ou non autorisé dans l'historique.",
      );
    }

    query.statut = filtres.statut;
  }

  // Filtre par catégorie.
  if (filtres.categorieId) {
    query.categorieId = convertirObjectId(filtres.categorieId, "categorieId");
  }

  // Filtre par zone.
  if (filtres.zoneId) {
    query.zoneId = convertirObjectId(filtres.zoneId, "zoneId");
  }

  // Filtrage sur la date de perte ou de découverte.
  const debutEvenement = convertirDate(filtres.dateDebut, "dateDebut");

  const finEvenement = convertirDate(filtres.dateFin, "dateFin", true);

  if (debutEvenement && finEvenement && debutEvenement > finEvenement) {
    throw new AppError(
      400,
      "INVALID_DATE_RANGE",
      "dateDebut doit être antérieure ou égale à dateFin.",
    );
  }

  if (debutEvenement || finEvenement) {
    query.dateEvenement = {};

    if (debutEvenement) {
      query.dateEvenement.$gte = debutEvenement;
    }

    if (finEvenement) {
      query.dateEvenement.$lte = finEvenement;
    }
  }

  // Filtrage facultatif sur la date de création.
  const debutCreation = convertirDate(
    filtres.dateCreationDebut,
    "dateCreationDebut",
  );

  const finCreation = convertirDate(
    filtres.dateCreationFin,
    "dateCreationFin",
    true,
  );

  if (debutCreation && finCreation && debutCreation > finCreation) {
    throw new AppError(
      400,
      "INVALID_DATE_RANGE",
      "dateCreationDebut doit être antérieure ou égale à dateCreationFin.",
    );
  }

  if (debutCreation || finCreation) {
    query.dateCreation = {};

    if (debutCreation) {
      query.dateCreation.$gte = debutCreation;
    }

    if (finCreation) {
      query.dateCreation.$lte = finCreation;
    }
  }

  return query;
}

// Définit le tri.
function construireTriHistorique(sort = "recent") {
  const tris = {
    recent: { dateCreation: -1, _id: -1 },
    ancien: { dateCreation: 1, _id: 1 },
    evenement_recent: { dateEvenement: -1, _id: -1 },
    evenement_ancien: { dateEvenement: 1, _id: 1 },
  };

  if (!tris[sort]) {
    throw new AppError(
      400,
      "INVALID_SORT",
      "Tri invalide. Valeurs acceptées : " + Object.keys(tris).join(", "),
    );
  }

  return tris[sort];
}

// Recherche l'historique du membre connecté.
async function getMemberHistory(memberId, filtres = {}, options = {}) {
  const page = Number(options.page ?? 1);
  const limit = Number(options.limit ?? 10);

  if (!Number.isInteger(page) || page < 1) {
    throw new AppError(
      400,
      "INVALID_PAGE",
      "La page doit être un entier supérieur ou égal à 1.",
    );
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new AppError(
      400,
      "INVALID_LIMIT",
      "La limite doit être comprise entre 1 et 100.",
    );
  }

  const skip = (page - 1) * limit;
  const query = construireFiltresHistorique(filtres, memberId);
  const tri = construireTriHistorique(options.sort || "recent");

  let requete = Declaration.find(
    query,
    filtres.keyword && filtres.keyword.trim()
      ? { score: { $meta: "textScore" } }
      : {},
  );

  if (filtres.keyword && filtres.keyword.trim()) {
    requete = requete.sort({
      score: { $meta: "textScore" },
      ...tri,
    });
  } else {
    requete = requete.sort(tri);
  }

  const [declarations, total] = await Promise.all([
    requete
      .skip(skip)
      .limit(limit)
      .populate("categorieId", "nom description")
      .populate("zoneId", "nom description emplacement")
      .lean(),

    Declaration.countDocuments(query),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    success: true,
    data: declarations,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}

module.exports = {
  getMemberHistory,
  construireFiltresHistorique,
  construireTriHistorique,
};
