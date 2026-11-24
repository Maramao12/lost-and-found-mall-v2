/* =====================================================================
   src/controllers/auth.controller.js
   ---------------------------------------------------------------------
   Création de compte, connexion, utilisateur connecté.
   Format des réponses : { success: true, data: ... }
   ===================================================================== */

const bcrypt = require("bcryptjs");
const Utilisateur = require("../models/Utilisateur");
const AppError = require("../utils/AppError");
const { signToken } = require("../utils/jwt");

// Coût du hachage du mot de passe
const BCRYPT_COST = 12;

// Hash factice pour éviter de révéler si un email existe
const HASH_FACTICE = bcrypt.hashSync("mot-de-passe-factice-1", BCRYPT_COST);

// POST /api/auth/register (public) -> crée un compte MEMBRE
async function register(req, res) {
  const { nom, prenom, email, motDePasse, telephone } = req.body;

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
    role: "MEMBRE", // Le rôle n'est jamais choisi par le client
    actif: true,
  });

  res.status(201).json({
    success: true,
    data: {
      token: signToken(utilisateur),
      user: utilisateur,
    },
  });
}

// POST /api/auth/login (public)
async function login(req, res) {
  const { email, motDePasse } = req.body;

  // Le hash est exclu par défaut dans le modèle
  const utilisateur = await Utilisateur.findOne({
    email: email,
  }).select("+motDePasseHash");

  const hashAComparer = utilisateur ? utilisateur.motDePasseHash : HASH_FACTICE;

  const motDePasseOk = await bcrypt.compare(motDePasse, hashAComparer);

  // Même message pour un email inconnu ou un mauvais mot de passe
  if (!utilisateur || !motDePasseOk) {
    throw new AppError(
      401,
      "INVALID_CREDENTIALS",
      "Email ou mot de passe incorrect",
    );
  }

  if (!utilisateur.actif) {
    throw new AppError(403, "ACCOUNT_DISABLED", "Ce compte est désactivé");
  }

  res.json({
    success: true,
    data: {
      token: signToken(utilisateur),
      user: utilisateur,
    },
  });
}

// GET /api/auth/me (connecté) -> utilisateur connecté
function me(req, res) {
  res.json({
    success: true,
    data: {
      user: req.user,
    },
  });
}

module.exports = { register, login, me };
