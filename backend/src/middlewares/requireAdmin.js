/*
 * requireAdmin.js
 * Vérifie que l'utilisateur authentifié est administrateur.
 *
 * IMPORTANT :
 * Le middleware JWT du Binôme 1 doit être exécuté AVANT celui-ci.
 * Il doit renseigner req.user avec l'identifiant et le rôle.
 */

const AppError = require("../utils/AppError");

function requireAdmin(req, res, next) {
  // Si req.user n'existe pas, l'utilisateur n'est pas authentifié.
  if (!req.user) {
    return next(
      new AppError(
        401,
        "AUTHENTICATION_REQUIRED",
        "Vous devez vous connecter.",
      ),
    );
  }

  // Un membre ne peut pas accéder aux fonctionnalités administratives.
  if (req.user.role !== "ADMIN") {
    return next(
      new AppError(
        403,
        "ADMIN_ACCESS_REQUIRED",
        "Accès réservé aux administrateurs.",
      ),
    );
  }

  next();
}

module.exports = requireAdmin;
