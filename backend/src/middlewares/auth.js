/* =====================================================================
   src/middlewares/auth.js
   ---------------------------------------------------------------------
   AUTHENTIFICATION et AUTORISATION. Utilisés par TOUS les binômes :

     const { authenticate, authorize } = require("../middlewares/auth");

     router.get("/",        authenticate, ctrl.liste);              // connecté
     router.delete("/:id",  authenticate, authorize("ADMIN"), ...); // admin seul

   Après authenticate, req.user est le document Utilisateur complet
   (sans le hash) : req.user._id, req.user.role, req.user.email...
   ===================================================================== */

const Utilisateur = require("../models/Utilisateur");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const { verifyToken } = require("../utils/jwt");

// 1) Vérifie le jeton "Authorization: Bearer <token>" et charge l'utilisateur.
const authenticate = asyncHandler(async function (req, res, next) {
  const entete = req.headers.authorization || "";
  const parties = entete.split(" ");

  if (parties.length !== 2 || parties[0] !== "Bearer" || !parties[1]) {
    throw new AppError(401, "UNAUTHENTICATED", "Authentification requise (en-tête Authorization: Bearer <token>)");
  }

  // Signature + expiration (erreurs JWT -> 401 via errorHandler)
  const payload = verifyToken(parties[1]);

  // On relit l'utilisateur à chaque requête : un compte désactivé ou un
  // rôle modifié est pris en compte IMMÉDIATEMENT.
  const utilisateur = await Utilisateur.findById(payload.sub);
  if (!utilisateur || !utilisateur.actif) {
    throw new AppError(401, "UNAUTHENTICATED", "Compte introuvable ou désactivé");
  }

  // Jeton émis avant le dernier changement de mot de passe -> refusé
  if (utilisateur.dateChangementMdp) {
    const changeLe = Math.floor(utilisateur.dateChangementMdp.getTime() / 1000);
    if (payload.iat < changeLe) {
      throw new AppError(401, "INVALID_TOKEN", "Mot de passe modifié : reconnectez-vous");
    }
  }

  req.user = utilisateur;
  next();
});

// 2) Restreint une route à certains rôles. À placer APRÈS authenticate.
function authorize() {
  const rolesAutorises = Array.prototype.slice.call(arguments);
  return function (req, res, next) {
    if (!req.user) {
      return next(new AppError(401, "UNAUTHENTICATED", "Authentification requise"));
    }
    if (rolesAutorises.indexOf(req.user.role) === -1) {
      return next(new AppError(403, "FORBIDDEN", "Droits insuffisants pour cette action"));
    }
    next();
  };
}

module.exports = { authenticate, authorize };