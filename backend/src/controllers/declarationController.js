/* =====================================================================
   src/controllers/declarationController.js
   ---------------------------------------------------------------------
   Cycle de vie des déclarations (binôme 1).

   RÈGLES MÉTIER (à justifier à la soutenance)
   -------------------------------------------
   Création       : tout utilisateur connecté. auteurId = utilisateur du
                    jeton, statut = PUBLIEE (jamais choisis par le client).
                    dateEvenement (date de perte / de découverte) est
                    obligatoire et ne peut pas être dans le futur.
   Consultation   : utilisateur connecté. Seuls nom/prénom de l'auteur sont
                    exposés (jamais email ni téléphone). Une déclaration
                    SUPPRIMEE n'est visible que par son auteur et un admin.
   Modification   : AUTEUR SEULEMENT (l'admin modère par suppression).
                    - PUBLIEE   : titre, description, dateEvenement, photo,
                                  catégorie, zone
                    - EN_COURS  : description et photo seulement (une
                                  correspondance est en cours, on ne change
                                  plus ce qui sert au matching : titre,
                                  date, catégorie, zone)
                    - RESTITUEE / SUPPRIMEE : plus modifiable
                    Le type (PERDU/TROUVE) n'est jamais modifiable.
   Suppression    : auteur ou admin, LOGIQUE (statut SUPPRIMEE).
                    Refusée si EN_COURS (remise en cours) ou RESTITUEE
                    (historique à conserver). Admin : motif obligatoire.
   Changement de  : auteur ou admin. Transitions permises :
   statut           PUBLIEE  -> EN_COURS | RESTITUEE
                    EN_COURS -> PUBLIEE  | RESTITUEE
                    RESTITUEE et SUPPRIMEE sont des états finaux.
   Compte         : la désactivation d'un compte ne touche pas ses
   désactivé        déclarations (elles gardent l'historique et les
                    correspondances).
   ===================================================================== */

const Declaration = require("../models/Declaration");
const Categorie = require("../models/Categorie");
const Zone = require("../models/Zone");
const AppError = require("../utils/AppError");

// ---------------------------------------------------------------------
// Outils internes
// ---------------------------------------------------------------------

const TRANSITIONS = {
  PUBLIEE: ["EN_COURS", "RESTITUEE"],
  EN_COURS: ["PUBLIEE", "RESTITUEE"],
  RESTITUEE: [],
  SUPPRIMEE: [],
};

// Champs modifiables selon le statut courant
const CHAMPS_MODIFIABLES = {
  PUBLIEE: [
    "titre",
    "description",
    "dateEvenement",
    "photoUrl",
    "categorieId",
    "zoneId",
  ],
  EN_COURS: ["description", "photoUrl"],
};

function estAuteur(declaration, utilisateur) {
  return String(declaration.auteurId) === String(utilisateur._id);
}

function estAdmin(utilisateur) {
  return utilisateur.role === "ADMIN";
}

async function chargerDeclaration(id) {
  const declaration = await Declaration.findById(id);
  if (!declaration)
    throw new AppError(404, "DECLARATION_NOT_FOUND", "Déclaration introuvable");
  return declaration;
}

async function verifierCategorieEtZone(categorieId, zoneId) {
  if (
    categorieId !== undefined &&
    !(await Categorie.exists({ _id: categorieId }))
  ) {
    throw new AppError(404, "CATEGORY_NOT_FOUND", "Catégorie introuvable");
  }
  if (zoneId !== undefined && !(await Zone.exists({ _id: zoneId }))) {
    throw new AppError(404, "ZONE_NOT_FOUND", "Zone introuvable");
  }
}

// ---------------------------------------------------------------------
// POST /api/declarations
// ---------------------------------------------------------------------
async function create(req, res) {
  const {
    type,
    titre,
    description,
    dateEvenement,
    categorieId,
    zoneId,
    photoUrl,
  } = req.body;

  await verifierCategorieEtZone(categorieId, zoneId);

  const declaration = await Declaration.create({
    type: type,
    titre: titre,
    description: description,
    dateEvenement: dateEvenement, // déjà converti en Date par Zod
    categorieId: categorieId,
    zoneId: zoneId,
    photoUrl: photoUrl || undefined,
    auteurId: req.user._id, // décidé par le serveur
    statut: "PUBLIEE", // décidé par le serveur
  });

  res.status(201).json({ success: true, data: { declaration: declaration } });
}

// ---------------------------------------------------------------------
// GET /api/declarations/me?page=&limit=&statut=&type=
// "Mes déclarations" (hors supprimées), paginées
// ---------------------------------------------------------------------
async function listMine(req, res) {
  const { page, limit, statut, type } = req.query;

  const filtre = { auteurId: req.user._id, statut: { $ne: "SUPPRIMEE" } };
  if (statut) filtre.statut = statut;
  if (type) filtre.type = type;

  // Utilise l'index idx_auteur (auteurId + dateCreation)
  const [declarations, total] = await Promise.all([
    Declaration.find(filtre)
      .sort({ dateCreation: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("categorieId", "nom")
      .populate("zoneId", "nom emplacement"),
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

// ---------------------------------------------------------------------
// GET /api/declarations/:id
// ---------------------------------------------------------------------
async function getOne(req, res) {
  const declaration = await Declaration.findById(req.params.id)
    .populate("categorieId", "nom")
    .populate("zoneId", "nom emplacement")
    .populate("auteurId", "nom prenom"); // PAS d'email ni de téléphone

  if (!declaration)
    throw new AppError(404, "DECLARATION_NOT_FOUND", "Déclaration introuvable");

  // Une déclaration supprimée est invisible, sauf pour son auteur et l'admin
  if (declaration.statut === "SUPPRIMEE") {
    const auteurId = declaration.auteurId && declaration.auteurId._id;
    const proprietaire = String(auteurId) === String(req.user._id);
    if (!proprietaire && !estAdmin(req.user)) {
      throw new AppError(
        404,
        "DECLARATION_NOT_FOUND",
        "Déclaration introuvable",
      );
    }
  }

  res.json({ success: true, data: { declaration: declaration } });
}

// ---------------------------------------------------------------------
// PATCH /api/declarations/:id
// ---------------------------------------------------------------------
async function update(req, res) {
  const declaration = await chargerDeclaration(req.params.id);

  // Pour ne pas révéler l'existence d'une déclaration à un autre membre
  // supprimée : on renvoie 404 ; sinon 403 si ce n'est pas la sienne.
  if (declaration.statut === "SUPPRIMEE") {
    throw new AppError(404, "DECLARATION_NOT_FOUND", "Déclaration introuvable");
  }
  if (!estAuteur(declaration, req.user)) {
    throw new AppError(
      403,
      "FORBIDDEN",
      "Seul l'auteur peut modifier cette déclaration",
    );
  }

  const autorises = CHAMPS_MODIFIABLES[declaration.statut];
  if (!autorises) {
    throw new AppError(
      409,
      "DECLARATION_LOCKED",
      "Une déclaration " + declaration.statut + " ne peut plus être modifiée",
    );
  }

  const refuses = Object.keys(req.body).filter(function (c) {
    return autorises.indexOf(c) === -1;
  });
  if (refuses.length > 0) {
    throw new AppError(
      409,
      "FIELD_LOCKED",
      "Champs non modifiables quand la déclaration est " +
        declaration.statut +
        " : " +
        refuses.join(", "),
      { champsRefuses: refuses, champsAutorises: autorises },
    );
  }

  await verifierCategorieEtZone(req.body.categorieId, req.body.zoneId);

  const { titre, description, dateEvenement, photoUrl, categorieId, zoneId } =
    req.body;
  if (titre !== undefined) declaration.titre = titre;
  if (description !== undefined) declaration.description = description;
  if (dateEvenement !== undefined) declaration.dateEvenement = dateEvenement;
  if (photoUrl !== undefined) declaration.photoUrl = photoUrl || undefined; // "" efface la photo
  if (categorieId !== undefined) declaration.categorieId = categorieId;
  if (zoneId !== undefined) declaration.zoneId = zoneId;
  declaration.dateModification = new Date();

  await declaration.save();
  res.json({ success: true, data: { declaration: declaration } });
}

// ---------------------------------------------------------------------
// PATCH /api/declarations/:id/statut   body : { statut }
// ---------------------------------------------------------------------
async function changeStatus(req, res) {
  const declaration = await chargerDeclaration(req.params.id);

  if (declaration.statut === "SUPPRIMEE") {
    throw new AppError(404, "DECLARATION_NOT_FOUND", "Déclaration introuvable");
  }
  if (!estAuteur(declaration, req.user) && !estAdmin(req.user)) {
    throw new AppError(
      403,
      "FORBIDDEN",
      "Seul l'auteur ou un administrateur peut changer le statut",
    );
  }

  const nouveau = req.body.statut;
  const permis = TRANSITIONS[declaration.statut];

  if (nouveau === declaration.statut) {
    throw new AppError(
      409,
      "SAME_STATUS",
      "La déclaration a déjà le statut " + nouveau,
    );
  }
  if (permis.indexOf(nouveau) === -1) {
    throw new AppError(
      409,
      "INVALID_TRANSITION",
      "Transition interdite : " + declaration.statut + " -> " + nouveau,
      { statutActuel: declaration.statut, transitionsPermises: permis },
    );
  }

  declaration.statut = nouveau;
  declaration.dateModification = new Date();
  await declaration.save();

  // TODO (avec les binômes 3 et 4) : notification STATUT_MODIFIE ou
  // OBJET_RESTITUE, et mise à jour des correspondances liées.
  res.json({ success: true, data: { declaration: declaration } });
}

// ---------------------------------------------------------------------
// DELETE /api/declarations/:id   body (facultatif) : { motif }
// Suppression LOGIQUE : statut SUPPRIMEE
// ---------------------------------------------------------------------
async function remove(req, res) {
  const declaration = await chargerDeclaration(req.params.id);

  if (declaration.statut === "SUPPRIMEE") {
    throw new AppError(404, "DECLARATION_NOT_FOUND", "Déclaration introuvable");
  }

  const auteur = estAuteur(declaration, req.user);
  if (!auteur && !estAdmin(req.user)) {
    throw new AppError(
      403,
      "FORBIDDEN",
      "Seul l'auteur ou un administrateur peut supprimer cette déclaration",
    );
  }

  // Un admin qui supprime la déclaration d'un autre doit justifier (diagramme de séquence)
  if (!auteur && !req.body.motif) {
    throw new AppError(
      400,
      "REASON_REQUIRED",
      "Motif de suppression obligatoire (10 caractères minimum)",
    );
  }

  if (declaration.statut === "EN_COURS") {
    throw new AppError(
      409,
      "DECLARATION_IN_PROGRESS",
      "Suppression impossible : remise en cours",
    );
  }
  if (declaration.statut === "RESTITUEE") {
    throw new AppError(
      409,
      "DECLARATION_RESTITUTED",
      "Suppression impossible : objet déjà restitué (historique conservé)",
    );
  }

  declaration.statut = "SUPPRIMEE";
  declaration.dateModification = new Date();
  await declaration.save();

  // TODO (binôme 3) : annuler les correspondances PROPOSEE / A_VERIFIER liées.
  // TODO (binôme 4) : journaliser le motif et notifier l'auteur si suppression par un admin.
  res.json({
    success: true,
    data: { message: "Déclaration supprimée", declaration: declaration },
  });
}

module.exports = { create, listMine, getOne, update, changeStatus, remove };

