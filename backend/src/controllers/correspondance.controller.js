/* =====================================================================
   Vérification et décision sur une correspondance :
   preuve -> question/réponse -> accepter / refuser -> restitution
   ===================================================================== */

const Correspondance = require("../models/Correspondance");
const Declaration = require("../models/Declaration");
const Utilisateur = require("../models/Utilisateur");
const Notification = require("../models/Notification");

// ---------------------------------------------------------------------
// Fonction utilitaire : charge la correspondance avec les 2 déclarations
// ---------------------------------------------------------------------
function chargerCorrespondance(id) {
  return Correspondance.findById(id)
    .populate("declarationPerdueId", "titre auteurId")
    .populate("declarationTrouveeId", "titre auteurId");
}

// Une correspondance acceptée ou refusée ne peut plus être modifiée
function estCloturee(corr) {
  return corr.statut === "ACCEPTEE" || corr.statut === "REFUSEE";
}

// 1. GET /api/correspondances/:id — Consulter une correspondance
async function getCorrespondanceById(req, res, next) {
  try {
    const corr = await Correspondance.findById(req.params.id)
      .populate("declarationPerdueId")
      .populate("declarationTrouveeId")
      .populate("analyseId");

    if (!corr) {
      return res.status(404).json({ success: false, message: "Correspondance introuvable." });
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
      return res.status(404).json({ success: false, message: "Correspondance introuvable." });
    }
    if (estCloturee(corr)) {
      return res.status(400).json({ success: false, message: "Cette correspondance est déjà clôturée." });
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

    return res.status(200).json({ success: true, message: "Preuve envoyée avec succès.", data: corr });
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
      return res.status(404).json({ success: false, message: "Correspondance introuvable." });
    }
    if (estCloturee(corr)) {
      return res.status(400).json({ success: false, message: "Cette correspondance est déjà clôturée." });
    }
    if (!corr.preuveProprietaire) {
      return res.status(400).json({ success: false, message: "Le propriétaire n'a pas encore envoyé de preuve." });
    }

    corr.questionVerification = questionVerification;
    corr.reponseVerification = undefined; // nouvelle question -> ancienne réponse effacée
    corr.statut = "A_VERIFIER";
    corr.dateMiseAJour = new Date();
    await corr.save();

    await Notification.create({
      utilisateurId: corr.declarationPerdueId.auteurId,
      titre: "Vérification demandée",
      message: `Question pour "${corr.declarationPerdueId.titre}" : ${questionVerification}`,
      type: "STATUT_MODIFIE",
    });

    return res.status(200).json({ success: true, message: "Question envoyée au propriétaire.", data: corr });
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
      return res.status(404).json({ success: false, message: "Correspondance introuvable." });
    }
    if (estCloturee(corr)) {
      return res.status(400).json({ success: false, message: "Cette correspondance est déjà clôturée." });
    }
    if (!corr.questionVerification) {
      return res.status(400).json({ success: false, message: "Aucune question de vérification n'a été posée." });
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

    return res.status(200).json({ success: true, message: "Réponse envoyée.", data: corr });
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
      return res.status(404).json({ success: false, message: "Correspondance introuvable." });
    }
    if (estCloturee(corr)) {
      return res.status(400).json({ success: false, message: "Cette correspondance est déjà clôturée." });
    }

    corr.statut = "REFUSEE";
    corr.motifRefus = motifRefus;
    corr.dateMiseAJour = new Date();
    await corr.save();

    await Notification.create({
      utilisateurId: corr.declarationPerdueId.auteurId,
      titre: "Correspondance refusée",
      message: `La correspondance pour "${corr.declarationPerdueId.titre}" a été refusée.` +
        (motifRefus ? ` Motif : ${motifRefus}` : ""),
      type: "CORRESPONDANCE_REFUSEE",
    });

    return res.status(200).json({ success: true, message: "Correspondance refusée.", data: corr });
  } catch (err) {
    next(err);
  }
}

// 6. PATCH /api/correspondances/:id/accepter — Celui qui a trouvé accepte
//    ACCEPTEE + déclarations EN_COURS + autres demandes annulées + téléphone
async function accepterCorrespondance(req, res, next) {
  try {
    const corr = await chargerCorrespondance(req.params.id);

    if (!corr) {
      return res.status(404).json({ success: false, message: "Correspondance introuvable." });
    }
    if (estCloturee(corr)) {
      return res.status(400).json({ success: false, message: "Cette correspondance est déjà clôturée." });
    }
    if (!corr.preuveProprietaire) {
      return res.status(400).json({ success: false, message: "Impossible d'accepter sans preuve du propriétaire." });
    }

    const idPerdue = corr.declarationPerdueId._id;
    const idTrouvee = corr.declarationTrouveeId._id;
    const maintenant = new Date();

    // a) La correspondance est acceptée
    corr.statut = "ACCEPTEE";
    corr.dateMiseAJour = maintenant;
    await corr.save();

    // b) Les 2 déclarations passent EN_COURS de remise
    await Declaration.updateMany(
      { _id: { $in: [idPerdue, idTrouvee] } },
      { $set: { statut: "EN_COURS", dateModification: maintenant } },
    );

    // c) Les autres demandes encore ouvertes sur ces déclarations sont annulées
    const annulation = await Correspondance.updateMany(
      {
        _id: { $ne: corr._id },
        statut: { $in: ["PROPOSEE", "A_VERIFIER"] },
        $or: [{ declarationPerdueId: idPerdue }, { declarationTrouveeId: idTrouvee }],
      },
      {
        $set: {
          statut: "REFUSEE",
          motifRefus: "Objet déjà attribué à une autre correspondance.",
          dateMiseAJour: maintenant,
        },
      },
    );

    // d) Récupérer les numéros de téléphone dans la collection utilisateurs
    const proprietaire = await Utilisateur.findById(corr.declarationPerdueId.auteurId).select("nom prenom telephone");
    const trouveur = await Utilisateur.findById(corr.declarationTrouveeId.auteurId).select("nom prenom telephone");
    const telephoneContact = trouveur && trouveur.telephone ? trouveur.telephone : "non renseigné";
    const telephoneProprietaire = proprietaire && proprietaire.telephone ? proprietaire.telephone : "non renseigné";

    // e) Notifier les deux membres avec le numéro de l'autre
    await Notification.create({
      utilisateurId: corr.declarationPerdueId.auteurId,
      titre: "Correspondance acceptée !",
      message: `Votre objet "${corr.declarationPerdueId.titre}" a été retrouvé. ` +
        `Contactez le ${telephoneContact} pour le récupérer à l'accueil du centre commercial.`,
      type: "CORRESPONDANCE_ACCEPTEE",
    });
    await Notification.create({
      utilisateurId: corr.declarationTrouveeId.auteurId,
      titre: "Correspondance acceptée !",
      message: `Vous avez validé la correspondance pour "${corr.declarationTrouveeId.titre}". ` +
        `Le propriétaire est joignable au ${telephoneProprietaire}. Rendez-vous à l'accueil du centre commercial.`,
      type: "CORRESPONDANCE_ACCEPTEE",
    });

    return res.status(200).json({
      success: true,
      message: "Correspondance acceptée. L'objet est en cours de remise.",
      telephoneContact,
      demandesAnnulees: annulation.modifiedCount,
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
      return res.status(404).json({ success: false, message: "Correspondance introuvable." });
    }
    if (corr.statut !== "ACCEPTEE") {
      return res.status(400).json({ success: false, message: "Seule une correspondance acceptée peut être restituée." });
    }

    const maintenant = new Date();
    await Declaration.updateMany(
      { _id: { $in: [corr.declarationPerdueId._id, corr.declarationTrouveeId._id] } },
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

    return res.status(200).json({ success: true, message: "Restitution confirmée.", data: corr });
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
};