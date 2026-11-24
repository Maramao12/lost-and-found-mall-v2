/* ============================================================
 * src/services/memberHistory.service.js
 *
 * Recherche et filtrage des déclarations du membre connecté.
 * IMPORTANT : memberId doit provenir de l'utilisateur connecté
 * (req.user.id ou req.user._id), jamais d'une valeur libre
 * envoyée par le membre.
 * ============================================================ */

const mongoose = require("mongoose");
const Declaration = require("../models/Declaration");

// Échappe les caractères spéciaux d'une expression régulière.
function echapperRegex(texte) {
  return texte.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Vérifie et convertit une date.
function convertirDate(valeur, nomChamp) {
  if (valeur === undefined || valeur === null || valeur === "") {
    return null;
  }

  const date = new Date(valeur);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`La date ${nomChamp} est invalide.`);
  }

  return date;
}

// Vérifie et convertit un identifiant MongoDB.
function convertirObjectId(valeur, nomChamp) {
  if (!mongoose.Types.ObjectId.isValid(valeur)) {
    throw new Error(`${nomChamp} est invalide.`);
  }

  return new mongoose.Types.ObjectId(valeur);
}

// Construit les filtres de l'historique.
function construireFiltresHistorique(filtres, memberId) {
  if (!memberId || !mongoose.Types.ObjectId.isValid(memberId)) {
    throw new Error("L'identifiant du membre est invalide.");
  }

  // Ce filtre est obligatoire : il limite les résultats au membre connecté.
  const query = {
    auteurId: new mongoose.Types.ObjectId(memberId),
  };

  // Recherche textuelle dans titre et description.
  if (filtres.keyword && filtres.keyword.trim()) {
    query.$text = {
      $search: filtres.keyword.trim(),
      $language: "french",
    };
  }

  if (filtres.type) {
    if (!["PERDU", "TROUVE"].includes(filtres.type)) {
      throw new Error("Le type doit être PERDU ou TROUVE.");
    }

    query.type = filtres.type;
  }

  if (filtres.statut) {
    const statutsAutorises = ["PUBLIEE", "EN_COURS", "RESTITUEE", "SUPPRIMEE"];

    if (!statutsAutorises.includes(filtres.statut)) {
      throw new Error("Le statut fourni est invalide.");
    }

    query.statut = filtres.statut;
  }

  if (filtres.categorieId) {
    query.categorieId = convertirObjectId(filtres.categorieId, "categorieId");
  }

  if (filtres.zoneId) {
    query.zoneId = convertirObjectId(filtres.zoneId, "zoneId");
  }

  // Filtrage sur la date à laquelle l'objet a été perdu ou trouvé.
  const debutEvenement = convertirDate(filtres.dateDebut, "dateDebut");

  const finEvenement = convertirDate(filtres.dateFin, "dateFin");

  if (debutEvenement || finEvenement) {
    if (debutEvenement && finEvenement && debutEvenement > finEvenement) {
      throw new Error("dateDebut doit être antérieure à dateFin.");
    }

    query.dateEvenement = {};

    if (debutEvenement) {
      query.dateEvenement.$gte = debutEvenement;
    }

    if (finEvenement) {
      query.dateEvenement.$lte = finEvenement;
    }
  }

  // Filtrage facultatif sur la date de création de la déclaration.
  const debutCreation = convertirDate(
    filtres.dateCreationDebut,
    "dateCreationDebut",
  );

  const finCreation = convertirDate(filtres.dateCreationFin, "dateCreationFin");

  if (debutCreation || finCreation) {
    if (debutCreation && finCreation && debutCreation > finCreation) {
      throw new Error(
        "dateCreationDebut doit être antérieure à dateCreationFin.",
      );
    }

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
function construireTriHistorique(sort) {
  const tris = {
    recent: { dateCreation: -1, _id: -1 },
    ancien: { dateCreation: 1, _id: 1 },
    evenement_recent: { dateEvenement: -1, _id: -1 },
    evenement_ancien: { dateEvenement: 1, _id: 1 },
  };

  return tris[sort] || tris.recent;
}

// Recherche l'historique du membre connecté.
async function getMemberHistory(memberId, filtres = {}, options = {}) {
  const page = Math.max(1, parseInt(options.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(options.limit, 10) || 10));

  const skip = (page - 1) * limit;
  const query = construireFiltresHistorique(filtres, memberId);
  const tri = construireTriHistorique(options.sort);

  let requete = Declaration.find(
    query,
    filtres.keyword ? { score: { $meta: "textScore" } } : {},
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
