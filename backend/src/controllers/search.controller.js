const { searchDeclarations } = require("../services/search.service");
const { searchCategories } = require("../services/categorySearch.service");
const { searchZones } = require("../services/zoneSearch.service");

// GET /api/search
// Après validate(), req.query contient les valeurs nettoyées et les valeurs par défaut.
async function search(req, res) {
  // On sépare : q (mot-clé), les options (tri/pagination) et le reste (filtres)
  const { q, sort, page, limit, ...filtres } = req.query;

  const resultat = await searchDeclarations(
    { keyword: q, ...filtres }, // le service attend "keyword", pas "q"
    { sort, page, limit },
  );

  res.status(200).json(resultat);
}

// GET /api/search/categories
async function categories(req, res) {
  const { q, sort, page, limit } = req.query;

  const resultat = await searchCategories(
    { keyword: q },
    { sort, page, limit },
  );

  res.status(200).json(resultat);
}

// GET /api/search/zones
async function zones(req, res) {
  const { q, sort, page, limit } = req.query;

  const resultat = await searchZones({ keyword: q }, { sort, page, limit });

  res.status(200).json(resultat);
}

module.exports = { search, categories, zones };
