/* =====================================================================
   Vérification et décision sur une correspondance :
   preuve -> question/réponse -> accepter / refuser -> restitution
   ===================================================================== */

const Correspondance = require("../models/Correspondance");
const Declaration = require("../models/Declaration");
const Utilisateur = require("../models/Utilisateur");
const Notification = require("../models/Notification");

// ---------------------------------------------------------------------
// Fonctions utilitaires
// ---------------------------------------------------------------------
function chargerCorrespondance(id) {
  return Correspondance.findById(id)
    .populate("declarationPerdueId", "titre auteurId")
    .populate("declarationTrouveeId", "titre auteurId");
}

function estCloturee(corr) {
  return corr.statut === "ACCEPTEE" || corr.statut === "REFUSEE";
}

function estProprietaire(corr, user) {
  const auteurId =
    corr.declarationPerdueId?.auteurId?._id ||
    corr.declarationPerdueId?.auteurId;
  return String(auteurId) === String(user._id);
}

function estTrouveur(corr, user) {
  const auteurId =
    corr.declarationTrouveeId?.auteurId?._id ||
    corr.declarationTrouveeId?.auteurId;
  return String(auteurId) === String(user._id);
}

function estAdmin(user) {
  return user && user.role === "ADMIN";
}

// ---------------------------------------------------------------------
// Annule les correspondances encore ouvertes (PROPOSEE / A_VERIFIER)
// liées à une ou plusieurs déclarations, et prévient l'autre personne.
//  - declarationIds : déclarations concernées
//  - exclureId      : correspondance à ne pas annuler (celle acceptée)
//  - motif          : raison enregistrée dans motifRefus
// Retourne le nombre de correspondances annulées.
// ---------------------------------------------------------------------
async function annulerCorrespondancesOuvertes({ declarationIds, exclureId, motif }) {
  const ids = declarationIds.map(String);

  const filtre = {
    statut: { $in: ["PROPOSEE", "A_VERIFIER"] },
    $or: [
      { declarationPerdueId: { $in: declarationIds } },
      { declarationTrouveeId: { $in: declarationIds } },
    ],
  };
  if (exclureId) filtre._id = { $ne: exclureId };

  const aAnnuler = await Correspondance.find(filtre)
    .populate("declarationPerdueId", "titre auteurId")
    .populate("declarationTrouveeId", "titre auteurId");

  if (aAnnuler.length === 0) return 0;

  await Correspondance.updateMany(
    { _id: { $in: aAnnuler.map((c) => c._id) } },
    { $set: { statut: "REFUSEE", motifRefus: motif, dateMiseAJour: new Date() } },
  );

  // On prévient l'auteur de l'AUTRE déclaration (celle qui n'est pas concernée)
  const notifications = [];
  for (const c of aAnnuler) {
    const perdue = c.declarationPerdueId;
    const trouvee = c.declarationTrouveeId;
    const autre = perdue && ids.includes(String(perdue._id)) ? trouvee : perdue;
    if (!autre || !autre.auteurId) continue;

    notifications.push({
      utilisateurId: autre.auteurId,
      titre: "Correspondance annulée",
      message: `Une correspondance liée à votre déclaration "${autre.titre}" a été annulée. Motif : ${motif}`,
      type: "CORRESPONDANCE_REFUSEE",
    });
  }
  if (notifications.length > 0) {
    await Notification.insertMany(notifications);
  }

  return aAnnuler.length;
}

// 1. GET /api/correspondances/:id — Consulter une correspondance
async function getCorrespondanceById(req, res, next) {
  try {
    const corr = await Correspondance.findById(req.params.id)
      .populate("declarationPerdueId")
      .populate("declarationTrouveeId")
      .populate("analyseId");

    if (!corr) {
      return res
        .status(404)
        .json({ success: false, message: "Correspondance introuvable." });
    }
    if (
      !estProprietaire(corr, req.user) &&
      !estTrouveur(corr, req.user) &&
      !estAdmin(req.user)
    ) {
      return res
        .status(403)
        .json({
          success: false,
          message: "Accès refusé à cette correspondance.",
        });
    }

    return res.status(200).json({ success: true, data: corr });
  } catch (err) {
    next(err);
  }
}

// 2. PATCH /api/correspondances/:id/preuve — Le propriétaire envoie un détail privé
async function envoyerPreuve(req, res, next) {
  try {
    const { preuveProprietaire } = req.body;
    const corr = await chargerCorrespondance(req.params.id);

    if (!corr) {
      return res
        .status(404)
        .json({ success: false, message: "Correspondance introuvable." });
    }
    if (!estProprietaire(corr, req.user)) {
      return res
        .status(403)
        .json({
          success: false,
          message: "Action réservée au propriétaire de l'objet perdu.",
        });
    }
    if (estCloturee(corr)) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Cette correspondance est déjà clôturée.",
        });
    }

    corr.preuveProprietaire = preuveProprietaire;
    corr.statut = "A_VERIFIER";
    corr.dateMiseAJour = new Date();
    await corr.save();

    await Notification.create({
      utilisateurId: corr.declarationTrouveeId.auteurId,
      titre: "Preuve reçue pour l'objet trouvé",
      message: `Un propriétaire a soumis une preuve pour "${corr.declarationTrouveeId.titre}" : ${preuveProprietaire}`,
      type: "STATUT_MODIFIE",
    });

    return res
      .status(200)
      .json({
        success: true,
        message: "Preuve envoyée avec succès.",
        data: corr,
      });
  } catch (err) {
    next(err);
  }
}

// 3. PATCH /api/correspondances/:id/demander-verification — Celui qui a trouvé pose une question
async function demanderVerification(req, res, next) {
  try {
    const { questionVerification } = req.body;
    const corr = await chargerCorrespondance(req.params.id);

    if (!corr) {
      return res
        .status(404)
        .json({ success: false, message: "Correspondance introuvable." });
    }
    if (!estTrouveur(corr, req.user)) {
      return res
        .status(403)
        .json({
          success: false,
          message: "Action réservée à celui qui a trouvé l'objet.",
        });
    }
    if (estCloturee(corr)) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Cette correspondance est déjà clôturée.",
        });
    }
    if (!corr.preuveProprietaire) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Le propriétaire n'a pas encore envoyé de preuve.",
        });
    }

    corr.questionVerification = questionVerification;
    corr.reponseVerification = undefined;
    corr.statut = "A_VERIFIER";
    corr.dateMiseAJour = new Date();
    await corr.save();

    await Notification.create({
      utilisateurId: corr.declarationPerdueId.auteurId,
      titre: "Vérification demandée",
      message: `Question pour "${corr.declarationPerdueId.titre}" : ${questionVerification}`,
      type: "STATUT_MODIFIE",
    });

    return res
      .status(200)
      .json({
        success: true,
        message: "Question envoyée au propriétaire.",
        data: corr,
      });
  } catch (err) {
    next(err);
  }
}

// 4. PATCH /api/correspondances/:id/repondre — Le propriétaire répond à la question
async function repondreVerification(req, res, next) {
  try {
    const { reponseVerification } = req.body;
    const corr = await chargerCorrespondance(req.params.id);

    if (!corr) {
      return res
        .status(404)
        .json({ success: false, message: "Correspondance introuvable." });
    }
    if (!estProprietaire(corr, req.user)) {
      return res
        .status(403)
        .json({
          success: false,
          message: "Action réservée au propriétaire de l'objet perdu.",
        });
    }
    if (estCloturee(corr)) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Cette correspondance est déjà clôturée.",
        });
    }
    if (!corr.questionVerification) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Aucune question de vérification n'a été posée.",
        });
    }

    corr.reponseVerification = reponseVerification;
    corr.dateMiseAJour = new Date();
    await corr.save();

    await Notification.create({
      utilisateurId: corr.declarationTrouveeId.auteurId,
      titre: "Réponse reçue",
      message: `Réponse du propriétaire pour "${corr.declarationTrouveeId.titre}" : ${reponseVerification}`,
      type: "STATUT_MODIFIE",
    });

    return res
      .status(200)
      .json({ success: true, message: "Réponse envoyée.", data: corr });
  } catch (err) {
    next(err);
  }
}

// 5. PATCH /api/correspondances/:id/refuser — Celui qui a trouvé refuse
async function refuserCorrespondance(req, res, next) {
  try {
    const { motifRefus } = req.body;
    const corr = await chargerCorrespondance(req.params.id);

    if (!corr) {
      return res
        .status(404)
        .json({ success: false, message: "Correspondance introuvable." });
    }
    if (!estTrouveur(corr, req.user)) {
      return res
        .status(403)
        .json({
          success: false,
          message: "Action réservée à celui qui a trouvé l'objet.",
        });
    }
    if (estCloturee(corr)) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Cette correspondance est déjà clôturée.",
        });
    }

    corr.statut = "REFUSEE";
    corr.motifRefus = motifRefus;
    corr.dateMiseAJour = new Date();
    await corr.save();

    await Notification.create({
      utilisateurId: corr.declarationPerdueId.auteurId,
      titre: "Correspondance refusée",
      message:
        `La correspondance pour "${corr.declarationPerdueId.titre}" a été refusée.` +
        (motifRefus ? ` Motif : ${motifRefus}` : ""),
      type: "CORRESPONDANCE_REFUSEE",
    });

    return res
      .status(200)
      .json({ success: true, message: "Correspondance refusée.", data: corr });
  } catch (err) {
    next(err);
  }
}

// 6. PATCH /api/correspondances/:id/accepter — Celui qui a trouvé accepte
async function accepterCorrespondance(req, res, next) {
  try {
    const corr = await chargerCorrespondance(req.params.id);

    if (!corr) {
      return res
        .status(404)
        .json({ success: false, message: "Correspondance introuvable." });
    }
    if (!estTrouveur(corr, req.user)) {
      return res
        .status(403)
        .json({
          success: false,
          message: "Action réservée à celui qui a trouvé l'objet.",
        });
    }
    if (estCloturee(corr)) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Cette correspondance est déjà clôturée.",
        });
    }
    if (!corr.preuveProprietaire) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Impossible d'accepter sans preuve du propriétaire.",
        });
    }

    const idPerdue = corr.declarationPerdueId._id;
    const idTrouvee = corr.declarationTrouveeId._id;
    const maintenant = new Date();

    corr.statut = "ACCEPTEE";
    corr.dateMiseAJour = maintenant;
    await corr.save();

    await Declaration.updateMany(
      { _id: { $in: [idPerdue, idTrouvee] } },
      { $set: { statut: "EN_COURS", dateModification: maintenant } },
    );

    // Les autres demandes encore ouvertes sur ces 2 déclarations sont
    // annulées et les personnes concernées sont prévenues
    const demandesAnnulees = await annulerCorrespondancesOuvertes({
      declarationIds: [idPerdue, idTrouvee],
      exclureId: corr._id,
      motif: "Objet déjà attribué à une autre correspondance.",
    });

    const proprietaire = await Utilisateur.findById(
      corr.declarationPerdueId.auteurId,
    ).select("nom prenom telephone");
    const trouveur = await Utilisateur.findById(
      corr.declarationTrouveeId.auteurId,
    ).select("nom prenom telephone");
    const telephoneContact =
      trouveur && trouveur.telephone ? trouveur.telephone : "non renseigné";
    const telephoneProprietaire =
      proprietaire && proprietaire.telephone
        ? proprietaire.telephone
        : "non renseigné";

    await Notification.create({
      utilisateurId: corr.declarationPerdueId.auteurId,
      titre: "Correspondance acceptée !",
      message:
        `Votre objet "${corr.declarationPerdueId.titre}" a été retrouvé. ` +
        `Contactez le ${telephoneContact} pour le récupérer à l'accueil du centre commercial.`,
      type: "CORRESPONDANCE_ACCEPTEE",
    });
    await Notification.create({
      utilisateurId: corr.declarationTrouveeId.auteurId,
      titre: "Correspondance acceptée !",
      message:
        `Vous avez validé la correspondance pour "${corr.declarationTrouveeId.titre}". ` +
        `Le propriétaire est joignable au ${telephoneProprietaire}. Rendez-vous à l'accueil du centre commercial.`,
      type: "CORRESPONDANCE_ACCEPTEE",
    });

    return res.status(200).json({
      success: true,
      message: "Correspondance acceptée. L'objet est en cours de remise.",
      telephoneContact,
      demandesAnnulees,
      data: corr,
    });
  } catch (err) {
    next(err);
  }
}

// 7. PATCH /api/correspondances/:id/restituer — Confirmer la restitution
async function confirmerRestitution(req, res, next) {
  try {
    const corr = await chargerCorrespondance(req.params.id);

    if (!corr) {
      return res
        .status(404)
        .json({ success: false, message: "Correspondance introuvable." });
    }
    // Restitution confirmée par le propriétaire, le trouveur
    // ou l'accueil du centre commercial (admin)
    if (
      !estProprietaire(corr, req.user) &&
      !estTrouveur(corr, req.user) &&
      !estAdmin(req.user)
    ) {
      return res.status(403).json({ success: false, message: "Accès refusé." });
    }
    if (corr.statut !== "ACCEPTEE") {
      return res
        .status(400)
        .json({
          success: false,
          message: "Seule une correspondance acceptée peut être restituée.",
        });
    }

    // Empêcher de confirmer deux fois la même restitution
    const dejaRestituee = await Declaration.countDocuments({
      _id: {
        $in: [corr.declarationPerdueId._id, corr.declarationTrouveeId._id],
      },
      statut: "RESTITUEE",
    });
    if (dejaRestituee > 0) {
      return res
        .status(400)
        .json({
          success: false,
          message: "La restitution de cet objet a déjà été confirmée.",
        });
    }

    const maintenant = new Date();
    await Declaration.updateMany(
      {
        _id: {
          $in: [corr.declarationPerdueId._id, corr.declarationTrouveeId._id],
        },
      },
      { $set: { statut: "RESTITUEE", dateModification: maintenant } },
    );

    corr.dateMiseAJour = maintenant;
    await corr.save();

    await Notification.insertMany([
      {
        utilisateurId: corr.declarationPerdueId.auteurId,
        titre: "Objet restitué",
        message: `L'objet "${corr.declarationPerdueId.titre}" vous a bien été restitué.`,
        type: "OBJET_RESTITUE",
      },
      {
        utilisateurId: corr.declarationTrouveeId.auteurId,
        titre: "Objet restitué",
        message: `L'objet "${corr.declarationTrouveeId.titre}" a bien été restitué à son propriétaire. Merci !`,
        type: "OBJET_RESTITUE",
      },
    ]);

    return res
      .status(200)
      .json({ success: true, message: "Restitution confirmée.", data: corr });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCorrespondanceById,
  envoyerPreuve,
  demanderVerification,
  repondreVerification,
  accepterCorrespondance,
  refuserCorrespondance,
  confirmerRestitution,
  annulerCorrespondancesOuvertes,
};