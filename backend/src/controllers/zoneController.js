/* =====================================================================
   src/controllers/zoneController.js
   ---------------------------------------------------------------------
   Gestion des zones du centre commercial (binôme 4).

   RÈGLES MÉTIER
   - Lecture (liste, détail) : tout utilisateur connecté (le formulaire
     de déclaration a besoin de la liste des zones).
   - Création, modification, suppression : ADMIN seulement.
   - Le nom est unique, sans tenir compte des majuscules ("Food court"
     et "food court" sont la même zone).
   - Suppression REFUSÉE (409) tant que des déclarations utilisent la
     zone : on ne casse jamais l'historique.
   ===================================================================== */

const Zone = require("../models/Zone");
const Declaration = require("../models/Declaration");
const AppError = require("../utils/AppError");

// Recherche insensible à la casse et aux accents (collation française)
function trouverParNom(nom) {
  return Zone.findOne({ nom: nom }).collation({ locale: "fr", strength: 1 });
}

async function chargerZone(id) {
  const zone = await Zone.findById(id);
  if (!zone) throw new AppError(404, "ZONE_NOT_FOUND", "Zone introuvable");
  return zone;
}

// GET /api/zones
async function list(req, res) {
  const zones = await Zone.find().sort({ nom: 1 });
  res.json({ success: true, data: zones, count: zones.length });
}

// GET /api/zones/:id
async function getOne(req, res) {
  const zone = await chargerZone(req.params.id);
  res.json({ success: true, data: { zone: zone } });
}

// POST /api/zones
async function create(req, res) {
  const { nom, description, emplacement } = req.body;

  if (await trouverParNom(nom)) {
    throw new AppError(
      409,
      "ZONE_ALREADY_EXISTS",
      "Une zone porte déjà ce nom",
    );
  }

  const zone = await Zone.create({
    nom: nom,
    description: description || undefined,
    emplacement: emplacement || undefined,
  });

  res.status(201).json({ success: true, data: { zone: zone } });
}

// PATCH /api/zones/:id
async function update(req, res) {
  const zone = await chargerZone(req.params.id);
  const { nom, description, emplacement } = req.body;

  if (nom !== undefined) {
    const existante = await trouverParNom(nom);
    if (existante && String(existante._id) !== String(zone._id)) {
      throw new AppError(
        409,
        "ZONE_ALREADY_EXISTS",
        "Une zone porte déjà ce nom",
      );
    }
    zone.nom = nom;
  }
  if (description !== undefined) zone.description = description || undefined; // "" efface
  if (emplacement !== undefined) zone.emplacement = emplacement || undefined;

  await zone.save();
  res.json({ success: true, data: { zone: zone } });
}

// DELETE /api/zones/:id
async function remove(req, res) {
  const zone = await chargerZone(req.params.id);

  const utilisations = await Declaration.countDocuments({ zoneId: zone._id });
  if (utilisations > 0) {
    throw new AppError(
      409,
      "ZONE_IN_USE",
      "Suppression impossible : " +
        utilisations +
        " déclaration(s) utilisent cette zone",
      { declarations: utilisations },
    );
  }

  await zone.deleteOne();
  res.json({ success: true, data: { message: "Zone supprimée" } });
}

module.exports = { list, getOne, create, update, remove };
