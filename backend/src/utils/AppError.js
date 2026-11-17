/* =====================================================================
   src/utils/AppError.js
   ---------------------------------------------------------------------
   Erreur "prévue" par l'application. Dans un contrôleur on écrit :
       throw new AppError(404, "NOT_FOUND", "Déclaration introuvable");
   Le gestionnaire d'erreurs (errorHandler.js) la transforme en réponse
   JSON cohérente pour toute l'API.
   ===================================================================== */

class AppError extends Error {
  // statusCode : code HTTP (400, 401, 403, 404, 409...)
  // code       : mot-clé lisible par le frontend ("VALIDATION_ERROR"...)
  // message    : phrase explicative
  // details    : informations supplémentaires (liste de champs invalides...)
  constructor(statusCode, code, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

module.exports = AppError;
