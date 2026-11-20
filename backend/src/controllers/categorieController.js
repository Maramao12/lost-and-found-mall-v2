/* =====================================================================
   src/controllers/categorieController.js
   ---------------------------------------------------------------------
   Gestion des catégories d'objets (binôme 4).

   RÈGLES MÉTIER
   - Lecture (liste, détail) : tout utilisateur connecté (le formulaire
     de déclaration a besoin de la liste des catégories).
   - Création, modification, suppression : ADMIN seulement.
   - Le nom est unique, sans tenir compte des majuscules ni des accents.
   - Suppression REFUSÉE (409) tant que des déclarations utilisent la
     catégorie : on ne casse jamais l'historique.
   ===================================================================== */

const Categorie = require("../models/Categorie");
const Declaration = require("../models/Declaration");
const AppError = require("../utils/AppError");

// Recherche insensible à la casse et aux accents (collation française)
function trouverParNom(nom) {
  return Categorie.findOne({ nom: nom }).collation({
    locale: "fr",
    strength: 1,
  });
}

async function chargerCategorie(id) {
  const categorie = await Categorie.findById(id);
  if (!categorie)
    throw new AppError(404, "CATEGORY_NOT_FOUND", "Catégorie introuvable");
  return categorie;
}

// GET /api/categories
async function list(req, res) {
  const categories = await Categorie.find().sort({ nom: 1 });
  res.json({ success: true, data: categories, count: categories.length });
}

// GET /api/categories/:id
async function getOne(req, res) {
  const categorie = await chargerCategorie(req.params.id);
  res.json({ success: true, data: { categorie: categorie } });
}

// POST /api/categories
async function create(req, res) {
  const { nom, description } = req.body;

  if (await trouverParNom(nom)) {
    throw new AppError(
      409,
      "CATEGORY_ALREADY_EXISTS",
      "Une catégorie porte déjà ce nom",
    );
  }

  const categorie = await Categorie.create({
    nom: nom,
    description: description || undefined,
  });

  res.status(201).json({ success: true, data: { categorie: categorie } });
}

// PATCH /api/categories/:id
async function update(req, res) {
  const categorie = await chargerCategorie(req.params.id);
  const { nom, description } = req.body;

  if (nom !== undefined) {
    const existante = await trouverParNom(nom);
    if (existante && String(existante._id) !== String(categorie._id)) {
      throw new AppError(
        409,
        "CATEGORY_ALREADY_EXISTS",
        "Une catégorie porte déjà ce nom",
      );
    }
    categorie.nom = nom;
  }
  if (description !== undefined)
    categorie.description = description || undefined; // "" efface

  await categorie.save();
  res.json({ success: true, data: { categorie: categorie } });
}

// DELETE /api/categories/:id
async function remove(req, res) {
  const categorie = await chargerCategorie(req.params.id);

  const utilisations = await Declaration.countDocuments({
    categorieId: categorie._id,
  });
  if (utilisations > 0) {
    throw new AppError(
      409,
      "CATEGORY_IN_USE",
      "Suppression impossible : " +
        utilisations +
        " déclaration(s) utilisent cette catégorie",
      { declarations: utilisations },
    );
  }

  await categorie.deleteOne();
  res.json({ success: true, data: { message: "Catégorie supprimée" } });
}

module.exports = { list, getOne, create, update, remove };
