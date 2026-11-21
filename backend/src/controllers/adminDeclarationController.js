/* =====================================================================
   src/controllers/adminDeclarationController.js
   ---------------------------------------------------------------------
   Consultation de TOUTES les déclarations par l'administrateur (binôme 4).

   RÈGLES MÉTIER
   - Contrairement à la recherche publique, l'admin voit tous les statuts
     (y compris SUPPRIMEE) : c'est un outil de supervision.
   - L'admin voit l'email de l'auteur (utile pour la modération), ce que
     les autres utilisateurs ne voient jamais.
   - Pagination obligatoire (max 50 par page) : jamais toute la base.
   - Recherche texte via l'index MongoDB "idx_texte" (titre + description).
   ===================================================================== */

const Declaration = require("../models/Declaration");

// GET /api/admin/declarations
async function list(req, res) {
  const {
    page,
    limit,
    statut,
    type,
    zoneId,
    categorieId,
    auteurId,
    q,
    depuis,
    jusqua,
    tri,
  } = req.query;

  const filtre = {};
  if (statut) filtre.statut = statut;
  if (type) filtre.type = type;
  if (zoneId) filtre.zoneId = zoneId;
  if (categorieId) filtre.categorieId = categorieId;
  if (auteurId) filtre.auteurId = auteurId;
  if (q) filtre.$text = { $search: q };
  if (depuis || jusqua) {
    filtre.dateCreation = {};
    if (depuis) filtre.dateCreation.$gte = depuis;
    if (jusqua) filtre.dateCreation.$lte = jusqua;
  }

  const sens = tri === "ancien" ? 1 : -1;

  const [declarations, total] = await Promise.all([
    Declaration.find(filtre)
      .sort({ dateCreation: sens })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("categorieId", "nom")
      .populate("zoneId", "nom emplacement")
      .populate("auteurId", "nom prenom email actif"),
    Declaration.countDocuments(filtre),
  ]);

  res.json({
    success: true,
    data: declarations,
    pagination: {
      page: page,
      limit: limit,
      total: total,
      pages: Math.max(1, Math.ceil(total / limit)),
    },
  });
}

module.exports = { list };
