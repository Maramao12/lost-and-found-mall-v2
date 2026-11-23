/* =====================================================================
   LOST & FOUND
   src/services/search.service.js

   Moteur de recherche des déclarations pour l'administration.

   Responsabilités :
   - Recherche textuelle dans titre et description
   - Filtres par type, statut, catégorie et zone
   - Filtre par date réelle de perte / découverte
   - Tri des résultats
   - Pagination
   - Comptage du nombre total de résultats

   Ce service est utilisé par le Binôme 4 via le contrôleur
   du Binôme 2. Il ne réalise pas le matching.
   ===================================================================== */

const mongoose = require("mongoose");

const Declaration = require("../models/Declaration");
const Categorie = require("../models/Categorie");
const Zone = require("../models/Zone");
const Utilisateur = require("../models/Utilisateur");

// ================================================================
// 1. Valeurs autorisées
// ================================================================

const TYPES_AUTORISES = ["PERDU", "TROUVE"];

const STATUTS_AUTORISES = ["PUBLIEE", "EN_COURS", "RESTITUEE", "SUPPRIMEE"];

const TRIS_AUTORISES = [
  "recent",
  "ancien",
  "evenement_recent",
  "evenement_ancien",
];

// ================================================================
// 2. Validation des identifiants MongoDB
// ================================================================

function verifierObjectId(valeur, nomChamp) {
  if (!mongoose.Types.ObjectId.isValid(valeur)) {
    throw new Error(`${nomChamp} doit être un identifiant MongoDB valide.`);
  }

  return new mongoose.Types.ObjectId(valeur);
}

// ================================================================
// 3. Conversion des dates
// ================================================================

function convertirDate(valeur, nomChamp, finDeJournee = false) {
  if (!valeur) {
    return null;
  }

  // Le format attendu est YYYY-MM-DD.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valeur)) {
    throw new Error(`${nomChamp} doit respecter le format YYYY-MM-DD.`);
  }

  const [annee, mois, jour] = valeur.split("-").map(Number);

  // Utiliser les dates locales pour inclure toute la journée.
  const date = finDeJournee
    ? new Date(annee, mois - 1, jour, 23, 59, 59, 999)
    : new Date(annee, mois - 1, jour, 0, 0, 0, 0);

  // Vérifier que la date existe réellement.
  if (
    date.getFullYear() !== annee ||
    date.getMonth() !== mois - 1 ||
    date.getDate() !== jour
  ) {
    throw new Error(`${nomChamp} n'est pas une date valide.`);
  }

  return date;
}

// ================================================================
// 4. Construire la requête MongoDB
// ================================================================

function construireRequeteRecherche(filtres = {}) {
  const query = {};

  // --------------------------------------------------------------
  // Recherche textuelle dans titre et description
  // Utilise l'index textuel "idx_texte" du script MongoDB.
  // --------------------------------------------------------------

  if (filtres.keyword && filtres.keyword.trim()) {
    query.$text = {
      $search: filtres.keyword.trim(),
      $language: "french",
    };
  }

  // --------------------------------------------------------------
  // Filtre par type : PERDU ou TROUVE
  // --------------------------------------------------------------

  if (filtres.type) {
    if (!TYPES_AUTORISES.includes(filtres.type)) {
      throw new Error("Type invalide : PERDU ou TROUVE attendu.");
    }

    query.type = filtres.type;
  }

  // --------------------------------------------------------------
  // Filtre par statut
  // Aucun statut n'est imposé automatiquement.
  // --------------------------------------------------------------

  if (filtres.statut) {
    if (!STATUTS_AUTORISES.includes(filtres.statut)) {
      throw new Error("Statut de déclaration invalide.");
    }

    query.statut = filtres.statut;
  }

  // --------------------------------------------------------------
  // Filtre par catégorie
  // --------------------------------------------------------------

  if (filtres.categorieId) {
    query.categorieId = verifierObjectId(filtres.categorieId, "categorieId");
  }

  // --------------------------------------------------------------
  // Filtre par zone
  // --------------------------------------------------------------

  if (filtres.zoneId) {
    query.zoneId = verifierObjectId(filtres.zoneId, "zoneId");
  }

  // --------------------------------------------------------------
  // Filtre par date de perte / découverte
  // Champ utilisé : dateEvenement
  // --------------------------------------------------------------

  const dateDebut = convertirDate(filtres.dateDebut, "dateDebut");

  const dateFin = convertirDate(filtres.dateFin, "dateFin", true);

  if (dateDebut && dateFin && dateDebut > dateFin) {
    throw new Error(
      "La date de début doit être antérieure ou égale à la date de fin.",
    );
  }

  if (dateDebut || dateFin) {
    query.dateEvenement = {};

    if (dateDebut) {
      query.dateEvenement.$gte = dateDebut;
    }

    if (dateFin) {
      query.dateEvenement.$lte = dateFin;
    }
  }

  return query;
}

// ================================================================
// 5. Définir le tri
// ================================================================

function construireTri(sort) {
  const tris = {
    // Date de publication : plus récente en premier
    recent: {
      dateCreation: -1,
      _id: -1,
    },

    // Date de publication : plus ancienne en premier
    ancien: {
      dateCreation: 1,
      _id: 1,
    },

    // Date de perte / découverte : plus récente en premier
    evenement_recent: {
      dateEvenement: -1,
      _id: -1,
    },

    // Date de perte / découverte : plus ancienne en premier
    evenement_ancien: {
      dateEvenement: 1,
      _id: 1,
    },
  };

  if (!TRIS_AUTORISES.includes(sort)) {
    throw new Error(
      "Tri invalide. Valeurs acceptées : " + TRIS_AUTORISES.join(", "),
    );
  }

  return tris[sort];
}

// ================================================================
// 6. Fonction principale de recherche
// ================================================================

async function searchDeclarations(filtres = {}, options = {}) {
  // --------------------------------------------------------------
  // Pagination
  // --------------------------------------------------------------

  const page = Number(options.page ?? 1);
  const limit = Number(options.limit ?? 10);

  if (!Number.isInteger(page) || page < 1) {
    throw new Error("La page doit être un entier supérieur ou égal à 1.");
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("La limite doit être comprise entre 1 et 100.");
  }

  // --------------------------------------------------------------
  // Tri
  // --------------------------------------------------------------

  const sort = options.sort ?? "recent";
  const tri = construireTri(sort);

  // --------------------------------------------------------------
  // Construction de la requête
  // --------------------------------------------------------------

  const query = construireRequeteRecherche(filtres);

  const skip = (page - 1) * limit;

  // --------------------------------------------------------------
  // Projection : champs utiles pour l'administration
  // --------------------------------------------------------------

  const projection = {
    type: 1,
    titre: 1,
    description: 1,
    dateEvenement: 1,
    dateCreation: 1,
    dateModification: 1,
    photoUrl: 1,
    statut: 1,
    auteurId: 1,
    categorieId: 1,
    zoneId: 1,
  };

  // Avec une recherche textuelle, récupérer aussi le score
  // de pertinence calculé par MongoDB.
  if (filtres.keyword && filtres.keyword.trim()) {
    projection.score = {
      $meta: "textScore",
    };
  }

  // --------------------------------------------------------------
  // Requête de recherche + comptage en parallèle
  // --------------------------------------------------------------

  let requeteDeclarations = Declaration.find(query, projection);

  // Si un mot-clé est fourni, les résultats les plus pertinents
  // apparaissent en premier, puis le tri choisi départage les résultats.
  if (filtres.keyword && filtres.keyword.trim()) {
    requeteDeclarations = requeteDeclarations.sort({
      score: { $meta: "textScore" },
      ...tri,
    });
  } else {
    requeteDeclarations = requeteDeclarations.sort(tri);
  }

  const [declarations, total] = await Promise.all([
    requeteDeclarations
      .skip(skip)
      .limit(limit)
      .populate("categorieId", "nom")
      .populate("zoneId", "nom emplacement")
      .populate("auteurId", "nom prenom")
      .lean(),

    Declaration.countDocuments(query),
  ]);

  // --------------------------------------------------------------
  // Informations de pagination
  // --------------------------------------------------------------

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

// ================================================================
// 7. Exporter le service
// ================================================================

module.exports = {
  searchDeclarations,
};
