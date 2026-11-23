/* =====================================================================
   src/controllers/users.controller.js
   ---------------------------------------------------------------------
   A) PROFIL de l'utilisateur connecté (/api/users/me...)
   B) GESTION des utilisateurs par l'ADMIN (/api/users...)

   Suppression = désactivation (actif:false), jamais d'effacement :
   les déclarations, messages et correspondances liés restent cohérents.
   ===================================================================== */

const bcrypt = require("bcryptjs");
const Utilisateur = require("../models/Utilisateur");
const AppError = require("../utils/AppError");
const { signToken } = require("../utils/jwt");

const BCRYPT_COST = 12;

// ---------------------------------------------------------------------
// Outils internes
// ---------------------------------------------------------------------

// Empêche de rester sans aucun administrateur actif.
async function verifierPasDernierAdmin(cible) {
  if (cible.role === "ADMIN" && cible.actif) {
    const autres = await Utilisateur.countDocuments({
      role: "ADMIN",
      actif: true,
      _id: { $ne: cible._id },
    });

    if (autres === 0) {
      throw new AppError(
        409,
        "LAST_ADMIN",
        "Opération impossible : c'est le dernier administrateur actif",
      );
    }
  }
}

async function chargerUtilisateur(id) {
  const utilisateur = await Utilisateur.findById(id);

  if (!utilisateur) {
    throw new AppError(404, "USER_NOT_FOUND", "Utilisateur introuvable");
  }

  return utilisateur;
}

// Échappe les caractères spéciaux pour une recherche texte sûre.
function echapperRegex(texte) {
  return texte.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---------------------------------------------------------------------
// A) PROFIL (utilisateur connecté)
// ---------------------------------------------------------------------

// GET /api/users/me
function getMe(req, res) {
  res.json({
    success: true,
    data: { user: req.user },
  });
}

// PATCH /api/users/me
// Modifie nom, prenom et telephone.
// Une chaîne vide efface le téléphone.
async function updateMe(req, res) {
  const utilisateur = req.user;
  const { nom, prenom, telephone } = req.body;

  if (nom !== undefined) utilisateur.nom = nom;
  if (prenom !== undefined) utilisateur.prenom = prenom;
  if (telephone !== undefined) {
    utilisateur.telephone = telephone || undefined;
  }

  await utilisateur.save();

  res.json({
    success: true,
    data: { user: utilisateur },
  });
}

// PATCH /api/users/me/password
async function changePassword(req, res) {
  const { motDePasseActuel, nouveauMotDePasse } = req.body;

  const utilisateur = await Utilisateur.findById(req.user._id).select(
    "+motDePasseHash",
  );

  if (!(await bcrypt.compare(motDePasseActuel, utilisateur.motDePasseHash))) {
    throw new AppError(
      401,
      "INVALID_CREDENTIALS",
      "Mot de passe actuel incorrect",
    );
  }

  utilisateur.motDePasseHash = await bcrypt.hash(
    nouveauMotDePasse,
    BCRYPT_COST,
  );

  utilisateur.dateChangementMdp = new Date();

  await utilisateur.save();

  // La session courante continue ; les autres jetons sont invalidés
  // si le middleware JWT vérifie dateChangementMdp.
  res.json({
    success: true,
    data: {
      message: "Mot de passe modifié",
      token: signToken(utilisateur),
    },
  });
}

// DELETE /api/users/me
// Body : { motDePasse }
// Désactive le compte de l'utilisateur connecté.
async function deleteMe(req, res) {
  const utilisateur = await Utilisateur.findById(req.user._id).select(
    "+motDePasseHash",
  );

  if (
    !(await bcrypt.compare(req.body.motDePasse, utilisateur.motDePasseHash))
  ) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Mot de passe incorrect");
  }

  await verifierPasDernierAdmin(utilisateur);

  utilisateur.actif = false;
  await utilisateur.save();

  // Le traitement des déclarations reste à la charge du module
  // responsable des déclarations.
  res.json({
    success: true,
    data: { message: "Compte désactivé" },
  });
}

// ---------------------------------------------------------------------
// B) ADMINISTRATION
// Routes protégées par authorize("ADMIN")
// ---------------------------------------------------------------------

// GET /api/users?page=1&limit=10&role=MEMBRE&actif=true&q=texte
async function list(req, res) {
  const { page, limit, role, actif, q } = req.query;

  const filtre = {};

  if (role) {
    filtre.role = role;
  }

  if (actif !== undefined) {
    filtre.actif = actif;
  }

  if (q) {
    const motif = new RegExp(echapperRegex(q), "i");
    filtre.$or = [{ nom: motif }, { prenom: motif }, { email: motif }];
  }

  const [utilisateurs, total] = await Promise.all([
    Utilisateur.find(filtre)
      .sort({ dateCreation: -1 })
      .skip((page - 1) * limit)
      .limit(limit),

    Utilisateur.countDocuments(filtre),
  ]);

  res.json({
    success: true,
    data: utilisateurs,
    pagination: {
      page: page,
      limit: limit,
      total: total,
      pages: Math.max(1, Math.ceil(total / limit)),
    },
  });
}

// POST /api/users
// L'admin crée un compte MEMBRE ou ADMIN.
async function create(req, res) {
  const { nom, prenom, email, motDePasse, telephone, role } = req.body;

  if (await Utilisateur.exists({ email: email })) {
    throw new AppError(
      409,
      "EMAIL_ALREADY_USED",
      "Un compte existe déjà avec cet email",
    );
  }

  const utilisateur = await Utilisateur.create({
    nom: nom,
    prenom: prenom,
    email: email,
    telephone: telephone || undefined,
    motDePasseHash: await bcrypt.hash(motDePasse, BCRYPT_COST),
    role: role,
    actif: true,
  });

  res.status(201).json({
    success: true,
    data: { user: utilisateur },
  });
}

// GET /api/users/:id
async function getOne(req, res) {
  const utilisateur = await chargerUtilisateur(req.params.id);

  res.json({
    success: true,
    data: { user: utilisateur },
  });
}

// PATCH /api/users/:id
async function update(req, res) {
  const utilisateur = await chargerUtilisateur(req.params.id);

  const { nom, prenom, email, telephone, role, actif, motDePasse } = req.body;

  const estSoiMeme = String(utilisateur._id) === String(req.user._id);

  const changeRole = role !== undefined && role !== utilisateur.role;

  const desactive = actif === false && utilisateur.actif;

  // Un administrateur ne peut pas modifier son propre rôle
  // ni désactiver son propre compte via cette route.
  if (estSoiMeme && (changeRole || desactive)) {
    throw new AppError(
      409,
      "SELF_LOCKOUT",
      "Vous ne pouvez pas modifier votre propre rôle ni désactiver votre propre compte",
    );
  }

  // Empêche de retirer les droits du dernier administrateur actif.
  if (
    utilisateur.role === "ADMIN" &&
    utilisateur.actif &&
    (role === "MEMBRE" || desactive)
  ) {
    await verifierPasDernierAdmin(utilisateur);
  }

  if (nom !== undefined) utilisateur.nom = nom;
  if (prenom !== undefined) utilisateur.prenom = prenom;
  if (email !== undefined) utilisateur.email = email;

  if (telephone !== undefined) {
    utilisateur.telephone = telephone || undefined;
  }

  if (role !== undefined) utilisateur.role = role;
  if (actif !== undefined) utilisateur.actif = actif;

  if (motDePasse !== undefined) {
    utilisateur.motDePasseHash = await bcrypt.hash(motDePasse, BCRYPT_COST);

    utilisateur.dateChangementMdp = new Date();
  }

  // L'index unique du modèle doit empêcher les emails en double.
  await utilisateur.save();

  res.json({
    success: true,
    data: { user: utilisateur },
  });
}

// DELETE /api/users/:id
// Désactivation logique, sans suppression physique.
async function remove(req, res) {
  const utilisateur = await chargerUtilisateur(req.params.id);

  if (String(utilisateur._id) === String(req.user._id)) {
    throw new AppError(
      409,
      "SELF_LOCKOUT",
      "Utilisez DELETE /api/users/me pour désactiver votre propre compte",
    );
  }

  await verifierPasDernierAdmin(utilisateur);

  utilisateur.actif = false;
  await utilisateur.save();

  res.json({
    success: true,
    data: {
      message: "Utilisateur désactivé",
      user: utilisateur,
    },
  });
}

module.exports = {
  getMe,
  updateMe,
  changePassword,
  deleteMe,
  list,
  create,
  getOne,
  update,
  remove,
};
