const { searchDeclarations } = require("../services/search.service");

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

module.exports = { search };
