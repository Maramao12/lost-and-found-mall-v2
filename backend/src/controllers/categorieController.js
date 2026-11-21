/* =====================================================================
   src/controllers/categorieController.js
   Catégories d'objets (Sacs, Bijoux, Vêtements...).
   Lecture : tout utilisateur connecté. Écriture : ADMIN seulement.
   Suppression refusée tant qu'une déclaration utilise la catégorie.
   ===================================================================== */

const Categorie = require("../models/Categorie");
const Declaration = require("../models/Declaration");
const AppError = require("../utils/AppError");

async function chargerCategorie(id) {
  const categorie = await Categorie.findById(id);
  if (!categorie)
    throw new AppError(404, "CATEGORY_NOT_FOUND", "Catégorie introuvable");
  return categorie;
}

async function verifierNomLibre(nom, idIgnore) {
  const filtre = { nom: nom };
  if (idIgnore) filtre._id = { $ne: idIgnore };
  // collation : "sacs" et "Sacs" sont considérés identiques
  const existe = await Categorie.findOne(filtre).collation({
    locale: "fr",
    strength: 2,
  });
  if (existe)
    throw new AppError(
      409,
      "CATEGORY_ALREADY_EXISTS",
      "Une catégorie porte déjà ce nom",
    );
}

// GET /api/categories
// Pas de pagination : la liste est courte et sert aux menus déroulants.
async function list(req, res) {
  const categories = await Categorie.find().sort({ nom: 1 });
  res.json({ success: true, data: categories });
}

// GET /api/categories/:id
async function getOne(req, res) {
  const categorie = await chargerCategorie(req.params.id);
  res.json({ success: true, data: { categorie: categorie } });
}

// POST /api/categories   (ADMIN)
async function create(req, res) {
  const { nom, description } = req.body;
  await verifierNomLibre(nom);
  const categorie = await Categorie.create({
    nom: nom,
    description: description || undefined,
  });
  res.status(201).json({ success: true, data: { categorie: categorie } });
}

// PATCH /api/categories/:id   (ADMIN)
async function update(req, res) {
  const categorie = await chargerCategorie(req.params.id);
  const { nom, description } = req.body;

  if (nom !== undefined && nom !== categorie.nom) {
    await verifierNomLibre(nom, categorie._id);
    categorie.nom = nom;
  }
  if (description !== undefined)
    categorie.description = description || undefined;

  await categorie.save();
  res.json({ success: true, data: { categorie: categorie } });
}

// DELETE /api/categories/:id   (ADMIN)
async function remove(req, res) {
  const categorie = await chargerCategorie(req.params.id);

  // Toutes les déclarations comptent, même SUPPRIMEE (l'historique garde la référence)
  const utilisees = await Declaration.countDocuments({
    categorieId: categorie._id,
  });
  if (utilisees > 0) {
    throw new AppError(
      409,
      "CATEGORY_IN_USE",
      "Suppression impossible : " +
        utilisees +
        " déclaration(s) utilisent cette catégorie",
      { declarations: utilisees },
    );
  }

  await categorie.deleteOne();
  res.json({ success: true, data: { message: "Catégorie supprimée" } });
}

module.exports = { list, getOne, create, update, remove };
