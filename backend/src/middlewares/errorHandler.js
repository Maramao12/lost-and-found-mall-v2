/* =====================================================================
   src/middlewares/errorHandler.js
   ---------------------------------------------------------------------
   Le cahier des charges demande des réponses d'erreur COHÉRENTES.
   Toutes les erreurs de l'API ont donc le même format :
     {
       "success": false,
       "error": { "code": "...", "message": "...", "details": ... }
     }
   ===================================================================== */

const { ZodError } = require("zod");
const AppError = require("../utils/AppError");

// ---------------------------------------------------------------------
// 1) Route inexistante : appelé quand aucune route n'a répondu
// ---------------------------------------------------------------------
function notFound(req, res, next) {
  next(new AppError(404, "ROUTE_NOT_FOUND", "Route introuvable : " + req.method + " " + req.originalUrl));
}

// ---------------------------------------------------------------------
// 2) Gestionnaire général (Express le reconnaît grâce à ses 4 paramètres)
// ---------------------------------------------------------------------
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = 500;
  let code = "INTERNAL_ERROR";
  let message = "Erreur interne du serveur";
  let details;

  if (err instanceof AppError) {
    // Erreur prévue par nous
    status = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;

  } else if (err instanceof ZodError) {
    // Données de la requête invalides (validation Zod)
    status = 400;
    code = "VALIDATION_ERROR";
    message = "Données invalides";
    details = err.issues.map(function (i) {
      return { champ: i.path.join("."), message: i.message };
    });

  } else if (err.name === "ValidationError") {
    // Validation Mongoose (champ obligatoire manquant, enum invalide...)
    status = 400;
    code = "VALIDATION_ERROR";
    message = "Données invalides";
    details = Object.values(err.errors).map(function (e) {
      return { champ: e.path, message: e.message };
    });

  } else if (err.name === "CastError") {
    // Identifiant MongoDB mal formé (ex : /declarations/abc)
    status = 400;
    code = "INVALID_ID";
    message = "Identifiant invalide : " + err.value;

  } else if (err.code === 11000) {
    // Doublon sur un index unique (ex : email déjà utilisé)
    status = 409;
    code = "DUPLICATE_KEY";
    message = "Cette valeur existe déjà";
    details = err.keyValue;

  } else if (err.code === 121) {
    // Document refusé par le validateur $jsonSchema de MongoDB
    status = 400;
    code = "DB_VALIDATION_ERROR";
    message = "Document refusé par la validation de la base";

  } else if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    // Jeton JWT invalide ou expiré
    status = 401;
    code = "INVALID_TOKEN";
    message = "Jeton invalide ou expiré";
  }

  // On trace seulement les vraies erreurs serveur dans la console
  if (status >= 500) {
    console.error(err);
  }

  res.status(status).json({
    success: false,
    error: { code: code, message: message, details: details }
  });
}

module.exports = { notFound, errorHandler };
