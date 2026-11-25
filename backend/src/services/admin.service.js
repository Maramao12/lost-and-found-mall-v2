/* =====================================================================
   src/services/admin.service.js
   ---------------------------------------------------------------------
   SERVICE BINOME 4 - PERSONNE 1

   Gestion :
   - Signalements
   - Traitement des signalements
   - Modération des déclarations
   - Masquer / Restaurer
   - Notifications

   Le service ne dépend pas de req ni de res.
   ===================================================================== */

const Signalement = require("../models/Signalement");
const Declaration = require("../models/Declaration");
const Notification = require("../models/Notification");
const AppError = require("../utils/AppError");
const Utilisateur = require("../models/Utilisateur");

// =====================================================================
// OUTIL : vérifier l'existence d'un signalement
// =====================================================================
async function chargerSignalement(id) {
  const signalement = await Signalement.findById(id);

  if (!signalement) {
    throw new AppError(404, "REPORT_NOT_FOUND", "Signalement introuvable");
  }

  return signalement;
}

// =====================================================================
// OUTIL : vérifier l'existence d'une déclaration
// =====================================================================
async function chargerDeclaration(id) {
  const declaration = await Declaration.findById(id);

  if (!declaration) {
    throw new AppError(404, "DECLARATION_NOT_FOUND", "Déclaration introuvable");
  }

  return declaration;
}

// =====================================================================
// OUTIL : créer une notification
// =====================================================================
async function notifierMembre(utilisateurId, titre, message) {
  if (!utilisateurId) return;

  await Notification.create({
    utilisateurId: utilisateurId,
    titre: titre,
    message: message,
    type: "SIGNALEMENT_TRAITE",
  });
}

// =====================================================================
// F1 + F2
// GET /api/admin/reports
// Liste et filtrage des signalements
// =====================================================================
async function getReports(filtres) {
  const { page, limit, motif, traite, dateDebut, dateFin, search } = filtres;

  const filtre = {};

  // Filtrage par motif
  if (motif) {
    filtre.motif = motif;
  }

  // Filtrage traité / non traité
  if (traite === "true") {
    filtre.dateTraitement = { $ne: null };
  }

  if (traite === "false") {
    filtre.dateTraitement = null;
  }

  // Filtrage par date de création
  if (dateDebut || dateFin) {
    filtre.dateCreation = {};

    if (dateDebut) {
      filtre.dateCreation.$gte = new Date(dateDebut);
    }

    if (dateFin) {
      filtre.dateCreation.$lte = new Date(dateFin);
    }
  }

  // Recherche textuelle sur la description du signalement
  if (search) {
    filtre.description = { $regex: search, $options: "i" };
  }

  const [signalements, total] = await Promise.all([
    Signalement.find(filtre)
      .populate({
        path: "declarationId",
        select: "titre type statut moderation",
      })
      .populate("membreId", "nom prenom")
      .populate("adminId", "nom prenom")
      .sort({ dateCreation: -1 })
      .skip((page - 1) * limit)
      .limit(limit),

    Signalement.countDocuments(filtre),
  ]);

  return {
    data: signalements,
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

// =====================================================================
// F3
// GET /api/admin/reports/:id
// Détails d'un signalement
// =====================================================================
async function getReportById(id) {
  const signalement = await Signalement.findById(id)
    .populate({
      path: "declarationId",
      populate: [
        { path: "auteurId", select: "nom prenom" },
        { path: "categorieId", select: "nom" },
        { path: "zoneId", select: "nom emplacement" },
      ],
    })
    .populate("membreId", "nom prenom")
    .populate("adminId", "nom prenom");

  if (!signalement) {
    throw new AppError(404, "REPORT_NOT_FOUND", "Signalement introuvable");
  }

  return signalement;
}

// =====================================================================
// F4 + F5 + F11
// PATCH /api/admin/reports/:id/resolve
// Traiter un signalement
// =====================================================================
async function resolveReport(id, adminId, donnees) {
  const { decision, commentaireAdmin } = donnees;

  // 1. Vérifier le signalement
  const signalement = await chargerSignalement(id);

  // 2. Refuser un deuxième traitement
  if (signalement.dateTraitement !== null) {
    throw new AppError(
      409,
      "REPORT_ALREADY_PROCESSED",
      "Ce signalement a déjà été traité",
    );
  }

  // 3. Charger la déclaration signalée
  const declaration = await chargerDeclaration(signalement.declarationId);

  // 4. Appliquer la décision
  if (decision === "JUSTIFIE_MASQUER") {
    if (declaration.statut === "SUPPRIMEE") {
      throw new AppError(
        409,
        "DECLARATION_DELETED",
        "Une déclaration supprimée ne peut pas être modérée",
      );
    }

    declaration.moderation = {
      estMasquee: true,
      adminId: adminId,
      motif: commentaireAdmin || signalement.description,
      dateAction: new Date(),
    };

    declaration.dateModification = new Date();

    await declaration.save();
  }

  // 5. Enregistrer le traitement
  signalement.adminId = adminId;
  signalement.dateTraitement = new Date();
  signalement.decision = decision;
  signalement.commentaireAdmin = commentaireAdmin || null;

  await signalement.save();

  // 6. Notification du membre qui a signalé
  let message = "";

  if (decision === "NON_JUSTIFIE") {
    message = "Votre signalement a été examiné et n'a pas été retenu.";
  } else if (decision === "JUSTIFIE_MAINTENIR") {
    message = "Votre signalement a été examiné. La déclaration est maintenue.";
  } else if (decision === "JUSTIFIE_MASQUER") {
    message = "Votre signalement a été examiné. La déclaration a été masquée.";
  }

  await notifierMembre(signalement.membreId, "Signalement traité", message);

  return {
    signalement,
    declaration,
  };
}

// =====================================================================
// F6 + F7
// GET /api/admin/declarations
// Liste et filtrage des déclarations
// =====================================================================
async function getDeclarations(filtres) {
  const {
    page,
    limit,
    type,
    statut,
    masquee,
    search,
    zoneId,
    categorieId,
    auteurId,
    q,
    depuis,
    jusqua,
    tri,
  } = filtres;

  const filtre = {};

  if (type) {
    filtre.type = type;
  }

  if (statut) {
    filtre.statut = statut;
  }

  if (masquee === "true") {
    filtre["moderation.estMasquee"] = true;
  }

  if (masquee === "false") {
    filtre["moderation.estMasquee"] = { $ne: true };
  }

  if (search) {
    filtre.titre = { $regex: search, $options: "i" };
  }
  // Filtres du binôme 4
  if (zoneId) filtre.zoneId = zoneId;
  if (categorieId) filtre.categorieId = categorieId;
  if (auteurId) filtre.auteurId = auteurId;

  // Recherche texte via l'index MongoDB idx_texte (titre + description)
  if (q) filtre.$text = { $search: q };

  if (depuis || jusqua) {
    filtre.dateCreation = {};
    if (depuis) filtre.dateCreation.$gte = depuis;
    if (jusqua) filtre.dateCreation.$lte = jusqua;
  }

  const sens = tri === "ancien" ? 1 : -1;

  const [declarations, total] = await Promise.all([
    Declaration.find(filtre)
      .populate("auteurId", "nom prenom email actif")
      .populate("categorieId", "nom")
      .populate("zoneId", "nom emplacement")
      .populate("moderation.adminId", "nom prenom")
      .sort({ dateCreation: sens })
      .skip((page - 1) * limit)
      .limit(limit),

    Declaration.countDocuments(filtre),
  ]);

  return {
    data: declarations,
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

// =====================================================================
// F8 + F9 + F10
// PATCH /api/admin/declarations/:id/moderation
// Masquer ou restaurer une déclaration
// =====================================================================
async function moderateDeclaration(id, adminId, donnees) {
  const { action, motif } = donnees;

  const declaration = await chargerDeclaration(id);

  // Les déclarations SUPPRIMEES ne peuvent pas être restaurées
  // par cette fonctionnalité.
  if (declaration.statut === "SUPPRIMEE") {
    throw new AppError(
      409,
      "DECLARATION_DELETED",
      "Une déclaration supprimée ne peut pas être modérée",
    );
  }

  const estMasquee = declaration.moderation?.estMasquee === true;

  // MASQUER
  if (action === "MASQUER") {
    if (estMasquee) {
      throw new AppError(
        409,
        "DECLARATION_ALREADY_HIDDEN",
        "Cette déclaration est déjà masquée",
      );
    }

    declaration.moderation = {
      estMasquee: true,
      adminId: adminId,
      motif: motif,
      dateAction: new Date(),
    };
  }

  // RESTAURER
  if (action === "RESTAURER") {
    if (!estMasquee) {
      throw new AppError(
        409,
        "DECLARATION_NOT_HIDDEN",
        "Cette déclaration n'est pas masquée",
      );
    }

    declaration.moderation = {
      estMasquee: false,
      adminId: adminId,
      motif: motif,
      dateAction: new Date(),
    };
  }

  declaration.dateModification = new Date();

  await declaration.save();

  // Notification de l'auteur de la déclaration
  const message =
    action === "MASQUER"
      ? "Votre déclaration a été masquée par l'administration. Motif : " + motif
      : "Votre déclaration a été restaurée par l'administration. Motif : " +
        motif;

  await notifierMembre(
    declaration.auteurId,
    action === "MASQUER" ? "Déclaration masquée" : "Déclaration restaurée",
    message,
  );

  return declaration;
}
// =====================================================================
// F12 : LISTE DES UTILISATEURS
// =====================================================================

async function getUsers(filtres) {
  const { page = 1, limit = 10, search, role, actif } = filtres;

  const filtre = {};

  // Recherche par nom, prénom ou email
  if (search) {
    const recherche = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    filtre.$or = [
      { nom: { $regex: recherche, $options: "i" } },
      { prenom: { $regex: recherche, $options: "i" } },
      { email: { $regex: recherche, $options: "i" } },
    ];
  }

  // Filtrer par rôle
  if (role) {
    filtre.role = role;
  }

  // Filtrer les comptes actifs ou suspendus
  if (actif !== undefined) {
    filtre.actif = actif === "true";
  }

  const [utilisateurs, total] = await Promise.all([
    Utilisateur.find(filtre)
      .select("-motDePasseHash")
      .sort({ dateCreation: -1 })
      .skip((page - 1) * limit)
      .limit(limit),

    Utilisateur.countDocuments(filtre),
  ]);

  return {
    data: utilisateurs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}
// =====================================================================
// F13 : SUSPENDRE OU REACTIVER UN UTILISATEUR
// =====================================================================

async function updateUserStatus(id, actif, adminId) {
  // 1. Chercher l'utilisateur
  const utilisateur = await Utilisateur.findById(id);

  if (!utilisateur) {
    throw new AppError(404, "USER_NOT_FOUND", "Utilisateur introuvable");
  }

  // 2. Empêcher la modification d'un compte administrateur
  if (utilisateur.role === "ADMIN") {
    throw new AppError(
      403,
      "ADMIN_ACCOUNT_PROTECTED",
      "Impossible de suspendre ou modifier un compte administrateur",
    );
  }

  // 3. Vérifier si le statut demandé est déjà appliqué
  if (utilisateur.actif === actif) {
    throw new AppError(
      409,
      actif ? "USER_ALREADY_ACTIVE" : "USER_ALREADY_SUSPENDED",
      actif
        ? "Cet utilisateur est déjà actif"
        : "Cet utilisateur est déjà suspendu",
    );
  }

  // 4. Modifier le statut
  utilisateur.actif = actif;

  // 5. Enregistrer dans MongoDB
  await utilisateur.save();

  // 6. Retourner le résultat sans mot de passe
  return {
    _id: utilisateur._id,
    nom: utilisateur.nom,
    prenom: utilisateur.prenom,
    email: utilisateur.email,
    role: utilisateur.role,
    actif: utilisateur.actif,
    dateCreation: utilisateur.dateCreation,
  };
}
// =====================================================================
// EXPORTS
// =====================================================================
module.exports = {
  getReports,
  getReportById,
  resolveReport,
  getDeclarations,
  moderateDeclaration,

  // Gestion des utilisateurs
  getUsers,
  updateUserStatus,
};
