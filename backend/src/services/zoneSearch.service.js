/* ============================================================
 * src/services/zoneSearch.service.js
 *
 * Recherche et filtrage des zones.
 * ============================================================ */

const Zone = require("../models/Zone");

// Échappe les caractères spéciaux d'une expression régulière.
function echapperRegex(texte) {
  return texte.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Construit les filtres de recherche.
function construireFiltresZone(filtres = {}) {
  const query = {};

  if (filtres.keyword && filtres.keyword.trim()) {
    const expression = new RegExp(echapperRegex(filtres.keyword.trim()), "i");

    query.$or = [
      { nom: expression },
      { description: expression },
      { emplacement: expression },
    ];
  }

  return query;
}

// Définit le tri des zones.
function construireTriZone(sort) {
  const tris = {
    nom_asc: { nom: 1, _id: 1 },
    nom_desc: { nom: -1, _id: -1 },
  };

  return tris[sort] || tris.nom_asc;
}

// Recherche les zones avec pagination.
async function searchZones(filtres = {}, options = {}) {
  const page = Math.max(1, parseInt(options.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(options.limit, 10) || 10));

  const skip = (page - 1) * limit;

  const query = construireFiltresZone(filtres);
  const tri = construireTriZone(options.sort);

  const [zones, total] = await Promise.all([
    Zone.find(query).sort(tri).skip(skip).limit(limit).lean(),

    Zone.countDocuments(query),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    success: true,
    data: zones,
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
  searchZones,
  construireFiltresZone,
  construireTriZone,
};
