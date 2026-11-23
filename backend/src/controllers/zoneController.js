/* =====================================================================
   src/controllers/zoneController.js
   Zones du centre commercial (Food court, Parking, Cinéma...).
   Lecture : tout utilisateur connecté. Écriture : ADMIN seulement.
   Suppression refusée tant qu'une déclaration utilise la zone.
   ===================================================================== */

const Zone = require("../models/Zone");
const Declaration = require("../models/Declaration");
const AppError = require("../utils/AppError");

async function chargerZone(id) {
  const zone = await Zone.findById(id);
  if (!zone) throw new AppError(404, "ZONE_NOT_FOUND", "Zone introuvable");
  return zone;
}

async function verifierNomLibre(nom, idIgnore) {
  const filtre = { nom: nom };
  if (idIgnore) filtre._id = { $ne: idIgnore };
  const existe = await Zone.findOne(filtre).collation({
    locale: "fr",
    strength: 2,
  });
  if (existe)
    throw new AppError(
      409,
      "ZONE_ALREADY_EXISTS",
      "Une zone porte déjà ce nom",
    );
}

// GET /api/zones
async function list(req, res) {
  const zones = await Zone.find().sort({ nom: 1 });
  res.json({ success: true, data: zones });
}

// GET /api/zones/:id
async function getOne(req, res) {
  const zone = await chargerZone(req.params.id);
  res.json({ success: true, data: { zone: zone } });
}

// POST /api/zones   (ADMIN)
async function create(req, res) {
  const { nom, description, emplacement } = req.body;
  await verifierNomLibre(nom);
  const zone = await Zone.create({
    nom: nom,
    description: description || undefined,
    emplacement: emplacement || undefined,
  });
  res.status(201).json({ success: true, data: { zone: zone } });
}

// PATCH /api/zones/:id   (ADMIN)
async function update(req, res) {
  const zone = await chargerZone(req.params.id);
  const { nom, description, emplacement } = req.body;

  if (nom !== undefined && nom !== zone.nom) {
    await verifierNomLibre(nom, zone._id);
    zone.nom = nom;
  }
  if (description !== undefined) zone.description = description || undefined;
  if (emplacement !== undefined) zone.emplacement = emplacement || undefined;

  await zone.save();
  res.json({ success: true, data: { zone: zone } });
}

// DELETE /api/zones/:id   (ADMIN)
async function remove(req, res) {
  const zone = await chargerZone(req.params.id);

  const utilisees = await Declaration.countDocuments({ zoneId: zone._id });
  if (utilisees > 0) {
    throw new AppError(
      409,
      "ZONE_IN_USE",
      "Suppression impossible : " +
        utilisees +
        " déclaration(s) utilisent cette zone",
      { declarations: utilisees },
    );
  }

  await zone.deleteOne();
  res.json({ success: true, data: { message: "Zone supprimée" } });
}

module.exports = { list, getOne, create, update, remove };
