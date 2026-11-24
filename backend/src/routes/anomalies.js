const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const { analyze } = require("../services/anomalyService");

// Adaptation aux middlewares du projet (export direct ou nommé)
const authMod = require("../middlewares/auth");
const adminMod = require("../middlewares/requireAdmin");
const auth =
  typeof authMod === "function"
    ? authMod
    : authMod.auth || authMod.authenticate || authMod.protect;
const requireAdmin =
  typeof adminMod === "function"
    ? adminMod
    : adminMod.requireAdmin || adminMod.isAdmin;

const SEUIL_SEMAINE = Number(process.env.SEUIL_DECLARATIONS_SEMAINE) || 5;
const NB_REFERENCE = 30;
const UNE_SEMAINE = 7 * 24 * 3600 * 1000;

// Recalcule nbDeclarationsSemaine de chaque membre (7 derniers jours)
async function synchroniserCompteurs(db) {
  const debut = new Date(Date.now() - UNE_SEMAINE);
  const counts = await db
    .collection("declarations")
    .aggregate([
      {
        $match: { statut: { $ne: "SUPPRIMEE" }, dateCreation: { $gte: debut } },
      },
      { $group: { _id: "$auteurId", total: { $sum: 1 } } },
    ])
    .toArray();

  await db
    .collection("utilisateurs")
    .updateMany(
      { role: "MEMBRE" },
      { $set: { nbDeclarationsSemaine: 0, debutSemaine: debut } },
    );
  if (counts.length > 0) {
    await db.collection("utilisateurs").bulkWrite(
      counts.map((c) => ({
        updateOne: {
          filter: { _id: c._id, role: "MEMBRE" },
          update: { $set: { nbDeclarationsSemaine: c.total } },
        },
      })),
    );
  }
}

// Candidats (au-dessus du seuil) + membres de référence + leurs événements
async function getEvents(db) {
  const debut = new Date(Date.now() - UNE_SEMAINE);

  const candidats = await db
    .collection("utilisateurs")
    .find({
      role: "MEMBRE",
      actif: true,
      nbDeclarationsSemaine: { $gt: SEUIL_SEMAINE },
    })
    .project({ _id: 1 })
    .toArray();
  const candidatIds = candidats.map((u) => u._id);
  if (candidatIds.length === 0)
    return { events: [], candidatIds, nbReference: 0 };

  const reference = await db
    .collection("utilisateurs")
    .aggregate([
      { $match: { role: "MEMBRE", actif: true, _id: { $nin: candidatIds } } },
      { $sample: { size: NB_REFERENCE } },
      { $project: { _id: 1 } },
    ])
    .toArray();
  const ids = [...candidatIds, ...reference.map((u) => u._id)];

  const declarations = await db
    .collection("declarations")
    .aggregate([
      {
        $match: {
          auteurId: { $in: ids },
          statut: { $ne: "SUPPRIMEE" },
          dateCreation: { $gte: debut },
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "categorieId",
          foreignField: "_id",
          as: "categorie",
        },
      },
      {
        $lookup: {
          from: "zones",
          localField: "zoneId",
          foreignField: "_id",
          as: "zone",
        },
      },
      {
        $lookup: {
          from: "utilisateurs",
          localField: "auteurId",
          foreignField: "_id",
          as: "auteur",
        },
      },
      { $unwind: "$categorie" },
      { $unwind: "$zone" },
      { $unwind: "$auteur" },
    ])
    .toArray();

  // PERDU = réclamation ; TROUVE = objet trouvé
  const events = declarations.map((d) => ({
    user_id: String(d.auteurId),
    user_name: `${d.auteur.prenom} ${d.auteur.nom}`,
    object_id: String(d._id),
    action: d.type === "PERDU" ? "claimed" : "found",
    category: d.categorie.nom,
    zone: d.zone.nom,
  }));
  return { events, candidatIds, nbReference: reference.length };
}

router.get("/anomalies", auth, requireAdmin, async (req, res, next) => {
  try {
    const db = mongoose.connection.db;
    const threshold = Number(req.query.threshold) || 0.6;

    await synchroniserCompteurs(db);
    const { events, candidatIds, nbReference } = await getEvents(db);
    const meta = {
      seuil_declarations_semaine: SEUIL_SEMAINE,
      nb_candidats: candidatIds.length,
      nb_reference: nbReference,
    };

    if (candidatIds.length === 0) {
      return res.json({
        message: "Aucun membre ne dépasse le seuil cette semaine",
        meta,
        users: [],
        graph: { nodes: [], links: [] },
      });
    }

    const result = analyze(events, threshold);
    if (result.users.length === 0) {
      return res.json({
        message: "Pas assez de membres pour comparer (minimum 5)",
        meta,
        users: [],
        graph: { nodes: [], links: [] },
      });
    }

    // Seuls les candidats peuvent être déclarés anormaux
    const cand = new Set(candidatIds.map(String));
    const users = result.users.map((u) => ({
      ...u,
      est_candidat: cand.has(u.user_id),
      is_anomaly: u.is_anomaly && cand.has(u.user_id),
    }));
    const nodes = result.graph.nodes.map((n) => ({
      ...n,
      anomaly: n.type === "user" && n.anomaly && cand.has(n.id.split(":")[1]),
    }));
    res.json({ meta, users, graph: { nodes, links: result.graph.links } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
