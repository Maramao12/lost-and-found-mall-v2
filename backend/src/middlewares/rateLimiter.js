/* =====================================================================
   src/middlewares/rateLimiter.js
   ---------------------------------------------------------------------
   Limite le nombre de requêtes par adresse IP : protège contre les
   attaques par force brute (deviner un mot de passe) et le spam.
   Réponse au même format JSON que les autres erreurs (code 429).
   ===================================================================== */

const rateLimit = require("express-rate-limit");

function reponse429(message) {
  return function (req, res) {
    res.status(429).json({
      success: false,
      error: { code: "TOO_MANY_REQUESTS", message: message }
    });
  };
}

const enProduction = process.env.NODE_ENV === "production";

// Connexion / inscription : seules les requêtes ÉCHOUÉES comptent
// (mauvais mot de passe, email déjà pris...). 10 essais / 15 min en production.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: enProduction ? 10 : 50,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: reponse429("Trop de tentatives, réessayez dans quelques minutes")
});

// Limite générale sur toute l'API : 300 requêtes / 15 min / IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: reponse429("Trop de requêtes, réessayez plus tard")
});

module.exports = { authLimiter, apiLimiter };