/* =====================================================================
   src/controllers/statsController.js
   ---------------------------------------------------------------------
   Statistiques du tableau de bord administrateur (binôme 4).

   CHOIX TECHNIQUES (à justifier à la soutenance)
   - Tout est calculé PAR MONGODB (pipelines d'agrégation), jamais en
     chargeant les documents dans Node : ça reste rapide avec 100 000
     déclarations.
   - Un $facet ne travaille que sur UNE collection : on fait un $facet
     par collection, lancés en parallèle (Promise.all).
   - "Objet récupéré" = déclaration au statut RESTITUEE (état final).
   - Les déclarations SUPPRIMEE (suppression logique) ne comptent pas
     dans les totaux d'activité ni dans le taux de restitution.
   - Les dates sont groupées dans le fuseau Africa/Tunis.
   ===================================================================== */

const Utilisateur = require("../models/Utilisateur");
const Declaration = require("../models/Declaration");
const Correspondance = require("../models/Correspondance");
const Signalement = require("../models/Signalement");
const { TYPE_DECLARATION, STATUT_DECLARATION } = require("../constants/enums");

const FUSEAU = "Africa/Tunis";
const MS_PAR_JOUR = 24 * 3600 * 1000;

// ---------------------------------------------------------------------
// Outils internes
// ---------------------------------------------------------------------

// [{ _id: "PERDU", total: 3 }, ...] -> { PERDU: 3, TROUVE: 0 }
// Les clés attendues valent 0 si elles n'apparaissent pas dans le résultat.
function versObjet(lignes, clesAttendues) {
  const resultat = {};
  clesAttendues.forEach(function (cle) {
    resultat[cle] = 0;
  });
  lignes.forEach(function (ligne) {
    resultat[ligne._id] = ligne.total;
  });
  return resultat;
}

function somme(objet) {
  return Object.keys(objet).reduce(function (acc, cle) {
    return acc + objet[cle];
  }, 0);
}

function arrondi(nombre, decimales) {
  const facteur = Math.pow(10, decimales);
  return Math.round(nombre * facteur) / facteur;
}

// ---------------------------------------------------------------------
// Calcul de la vue d'ensemble (réutilisé par /overview et /export)
// ---------------------------------------------------------------------
async function calculerOverview() {
  const [utilisateurs, declarations, correspondances, signalements] =
    await Promise.all([
      // --- utilisateurs : actifs / inactifs et rôles ---
      Utilisateur.aggregate([
        {
          $facet: {
            parActif: [{ $group: { _id: "$actif", total: { $sum: 1 } } }],
            parRole: [{ $group: { _id: "$role", total: { $sum: 1 } } }],
          },
        },
      ]),

      // --- déclarations : par type, par statut, délai de restitution ---
      Declaration.aggregate([
        {
          $facet: {
            parType: [
              { $match: { statut: { $ne: "SUPPRIMEE" } } },
              { $group: { _id: "$type", total: { $sum: 1 } } },
            ],
            parStatut: [{ $group: { _id: "$statut", total: { $sum: 1 } } }],
            delai: [
              { $match: { statut: "RESTITUEE" } },
              {
                $group: {
                  _id: null,
                  moyenneMs: {
                    $avg: { $subtract: ["$dateModification", "$dateCreation"] },
                  },
                },
              },
            ],
          },
        },
      ]),

      // --- correspondances : par statut + score moyen ---
      Correspondance.aggregate([
        {
          $group: {
            _id: "$statut",
            total: { $sum: 1 },
            scoreMoyen: { $avg: "$scoreGlobal" },
          },
        },
      ]),

      // --- signalements : traités / non traités (dateTraitement null = non traité) ---
      Signalement.aggregate([
        {
          $group: {
            _id: {
              $cond: [
                { $eq: [{ $ifNull: ["$dateTraitement", null] }, null] },
                "NON_TRAITE",
                "TRAITE",
              ],
            },
            total: { $sum: 1 },
          },
        },
      ]),
    ]);

  // ----- utilisateurs -----
  const uActif = utilisateurs[0].parActif;
  const uRole = versObjet(utilisateurs[0].parRole, ["MEMBRE", "ADMIN"]);
  const nbActifs = (
    uActif.find(function (l) {
      return l._id === true;
    }) || { total: 0 }
  ).total;
  const nbInactifs = (
    uActif.find(function (l) {
      return l._id === false;
    }) || { total: 0 }
  ).total;

  // ----- déclarations -----
  const dParType = versObjet(declarations[0].parType, TYPE_DECLARATION);
  const dParStatut = versObjet(declarations[0].parStatut, STATUT_DECLARATION);
  const totalHorsSupprimees = somme(dParType);
  const restituees = dParStatut.RESTITUEE || 0;
  const delai = declarations[0].delai[0];

  // ----- correspondances -----
  const cParStatut = versObjet(correspondances, []);
  const totalCorr = somme(cParStatut);
  const scorePondere = correspondances.reduce(function (acc, l) {
    return acc + l.scoreMoyen * l.total;
  }, 0);

  // ----- signalements -----
  const sParEtat = versObjet(signalements, ["TRAITE", "NON_TRAITE"]);

  return {
    utilisateurs: {
      total: nbActifs + nbInactifs,
      actifs: nbActifs,
      inactifs: nbInactifs,
      membres: uRole.MEMBRE,
      admins: uRole.ADMIN,
    },
    declarations: {
      total: totalHorsSupprimees,
      parType: dParType,
      parStatut: dParStatut,
      objetsRecuperes: restituees,
      tauxRestitution:
        totalHorsSupprimees > 0
          ? arrondi((restituees / totalHorsSupprimees) * 100, 1)
          : 0,
      // Approximation : dateModification d'une déclaration RESTITUEE (état final,
      // non modifiable ensuite) = date de la restitution.
      delaiMoyenRestitutionJours: delai
        ? arrondi(delai.moyenneMs / MS_PAR_JOUR, 1)
        : null,
    },
    correspondances: {
      total: totalCorr,
      parStatut: cParStatut,
      scoreMoyen: totalCorr > 0 ? arrondi(scorePondere / totalCorr, 2) : null,
    },
    signalements: {
      total: somme(sParEtat),
      traites: sParEtat.TRAITE,
      nonTraites: sParEtat.NON_TRAITE,
    },
  };
}

// ---------------------------------------------------------------------
// Répartition des déclarations par zone ou par catégorie
// (un $group puis UN $lookup par groupe : léger même avec beaucoup de données)
// ---------------------------------------------------------------------
function repartition(champId, collection) {
  return Declaration.aggregate([
    { $match: { statut: { $ne: "SUPPRIMEE" } } },
    {
      $group: {
        _id: "$" + champId,
        total: { $sum: 1 },
        perdus: { $sum: { $cond: [{ $eq: ["$type", "PERDU"] }, 1, 0] } },
        trouves: { $sum: { $cond: [{ $eq: ["$type", "TROUVE"] }, 1, 0] } },
        restituees: {
          $sum: { $cond: [{ $eq: ["$statut", "RESTITUEE"] }, 1, 0] },
        },
      },
    },
    {
      $lookup: {
        from: collection,
        localField: "_id",
        foreignField: "_id",
        as: "ref",
      },
    },
    { $unwind: { path: "$ref", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        id: "$_id",
        nom: { $ifNull: ["$ref.nom", "(introuvable)"] },
        total: 1,
        perdus: 1,
        trouves: 1,
        restituees: 1,
      },
    },
    { $sort: { total: -1 } },
  ]);
}

// ---------------------------------------------------------------------
// Série temporelle : nombre de documents créés par jour ou par mois
// ---------------------------------------------------------------------
function serie(
  Modele,
  champDate,
  format,
  debut,
  fin,
  champSeparation,
  filtreSupplementaire,
) {
  const id = {
    periode: {
      $dateToString: {
        format: format,
        date: "$" + champDate,
        timezone: FUSEAU,
      },
    },
  };
  if (champSeparation) id.cle = "$" + champSeparation;

  const filtre = Object.assign({}, filtreSupplementaire);
  filtre[champDate] = { $gte: debut, $lte: fin };

  return Modele.aggregate([
    { $match: filtre },
    { $group: { _id: id, total: { $sum: 1 } } },
    { $sort: { "_id.periode": 1 } },
  ]);
}
// ---------------------------------------------------------------------
// GET /api/admin/stats/overview
// ---------------------------------------------------------------------
async function overview(req, res) {
  const data = await calculerOverview();
  res.json({ success: true, data: data });
}

// ---------------------------------------------------------------------
// GET /api/admin/stats/evolution?periode=jour|mois&depuis=&jusqua=
// Par défaut : 30 derniers jours (jour) ou 12 derniers mois (mois).
// ---------------------------------------------------------------------
async function evolution(req, res) {
  const periode = req.query.periode;
  const format = periode === "mois" ? "%Y-%m" : "%Y-%m-%d";

  const fin = req.query.jusqua || new Date();
  const debut =
    req.query.depuis ||
    new Date(fin.getTime() - (periode === "mois" ? 365 : 30) * MS_PAR_JOUR);

  const [declarations, correspondances, inscriptions] = await Promise.all([
    serie(Declaration, "dateCreation", format, debut, fin, "type", {
      statut: { $ne: "SUPPRIMEE" },
    }),
    serie(Correspondance, "dateCreation", format, debut, fin),
    serie(Utilisateur, "dateCreation", format, debut, fin),
  ]);

  // Regroupe les déclarations par période : { periode, PERDU, TROUVE, total }
  const parPeriode = {};
  declarations.forEach(function (ligne) {
    const p = ligne._id.periode;
    if (!parPeriode[p])
      parPeriode[p] = { periode: p, PERDU: 0, TROUVE: 0, total: 0 };
    parPeriode[p][ligne._id.cle] = ligne.total;
    parPeriode[p].total += ligne.total;
  });

  function simple(lignes) {
    return lignes.map(function (l) {
      return { periode: l._id.periode, total: l.total };
    });
  }

  res.json({
    success: true,
    data: {
      periode: periode,
      depuis: debut,
      jusqua: fin,
      declarations: Object.keys(parPeriode).map(function (p) {
        return parPeriode[p];
      }),
      correspondances: simple(correspondances),
      inscriptions: simple(inscriptions),
    },
  });
}

// GET /api/admin/stats/par-zone
async function parZone(req, res) {
  const data = await repartition("zoneId", "zones");
  res.json({ success: true, data: data });
}

// GET /api/admin/stats/par-categorie
async function parCategorie(req, res) {
  const data = await repartition("categorieId", "categories");
  res.json({ success: true, data: data });
}

// ---------------------------------------------------------------------
// GET /api/admin/stats/export  -> rapport statistique en CSV
// Séparateur ";" et BOM UTF-8 : s'ouvre correctement dans Excel (version française).
// ---------------------------------------------------------------------
function ligneCsv(champs) {
  return champs
    .map(function (c) {
      return (
        '"' +
        String(c === null || c === undefined ? "" : c).replace(/"/g, '""') +
        '"'
      );
    })
    .join(";");
}

async function exportCsv(req, res) {
  const [o, zones, categories] = await Promise.all([
    calculerOverview(),
    repartition("zoneId", "zones"),
    repartition("categorieId", "categories"),
  ]);

  const lignes = [ligneCsv(["Section", "Indicateur", "Valeur"])];
  function ajouter(section, indicateur, valeur) {
    lignes.push(ligneCsv([section, indicateur, valeur]));
  }

  ajouter("Utilisateurs", "Total", o.utilisateurs.total);
  ajouter("Utilisateurs", "Actifs", o.utilisateurs.actifs);
  ajouter("Utilisateurs", "Inactifs", o.utilisateurs.inactifs);
  ajouter("Utilisateurs", "Membres", o.utilisateurs.membres);
  ajouter("Utilisateurs", "Administrateurs", o.utilisateurs.admins);

  ajouter("Déclarations", "Total (hors supprimées)", o.declarations.total);
  Object.keys(o.declarations.parType).forEach(function (t) {
    ajouter("Déclarations", "Type " + t, o.declarations.parType[t]);
  });
  Object.keys(o.declarations.parStatut).forEach(function (s) {
    ajouter("Déclarations", "Statut " + s, o.declarations.parStatut[s]);
  });
  ajouter("Déclarations", "Objets récupérés", o.declarations.objetsRecuperes);
  ajouter(
    "Déclarations",
    "Taux de restitution (%)",
    o.declarations.tauxRestitution,
  );
  ajouter(
    "Déclarations",
    "Délai moyen de restitution (jours)",
    o.declarations.delaiMoyenRestitutionJours,
  );

  ajouter("Correspondances", "Total", o.correspondances.total);
  Object.keys(o.correspondances.parStatut).forEach(function (s) {
    ajouter("Correspondances", "Statut " + s, o.correspondances.parStatut[s]);
  });
  ajouter("Correspondances", "Score moyen", o.correspondances.scoreMoyen);

  ajouter("Signalements", "Total", o.signalements.total);
  ajouter("Signalements", "Traités", o.signalements.traites);
  ajouter("Signalements", "Non traités", o.signalements.nonTraites);

  zones.forEach(function (z) {
    ajouter("Par zone", z.nom, z.total);
  });
  categories.forEach(function (c) {
    ajouter("Par catégorie", c.nom, c.total);
  });

  const jour = new Date().toISOString().slice(0, 10);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="rapport-statistiques-' + jour + '.csv"',
  );
  res.send("\uFEFF" + lignes.join("\r\n"));
}

module.exports = { overview, evolution, parZone, parCategorie, exportCsv };
