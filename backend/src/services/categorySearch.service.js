/* ============================================================
 * src/services/categorySearch.service.js
 *
 * Recherche et filtrage des catégories.
 * ============================================================ */

const Categorie = require("../models/Categorie");

// Échappe les caractères spéciaux d'une expression régulière.
function echapperRegex(texte) {
  return texte.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Construit les filtres de recherche.
function construireFiltresCategorie(filtres = {}) {
  const query = {};

  if (filtres.keyword && filtres.keyword.trim()) {
    const expression = new RegExp(echapperRegex(filtres.keyword.trim()), "i");

    query.$or = [{ nom: expression }, { description: expression }];
  }

  return query;
}

// Définit le tri des catégories.
function construireTriCategorie(sort) {
  const tris = {
    nom_asc: { nom: 1, _id: 1 },
    nom_desc: { nom: -1, _id: -1 },
  };

  return tris[sort] || tris.nom_asc;
}

// Collation : tri alphabétique français sans distinction
// entre majuscules et minuscules.
const COLLATION_FR = {
  locale: "fr",
  strength: 2,
};

// Recherche les catégories avec pagination.
async function searchCategories(filtres = {}, options = {}) {
  const page = Math.max(1, parseInt(options.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(options.limit, 10) || 10));

  const skip = (page - 1) * limit;

  const query = construireFiltresCategorie(filtres);
  const tri = construireTriCategorie(options.sort);

  const [categories, total] = await Promise.all([
    Categorie.find(query)
      .collation(COLLATION_FR)
      .sort(tri)
      .skip(skip)
      .limit(limit)
      .lean(),

    Categorie.countDocuments(query),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    success: true,
    data: categories,
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
  searchCategories,
  construireFiltresCategorie,
  construireTriCategorie,
};
