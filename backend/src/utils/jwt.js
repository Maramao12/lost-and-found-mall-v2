/* =====================================================================
   src/utils/jwt.js
   ---------------------------------------------------------------------
   Création et vérification des jetons JWT.
   Le jeton contient seulement l'id (sub) et le rôle. Il est signé avec
   JWT_SECRET (fichier .env) : sans ce secret, impossible d'en fabriquer
   un faux. Le rôle du jeton n'est PAS utilisé pour les droits : le
   middleware relit l'utilisateur en base à chaque requête.
   ===================================================================== */

const jwt = require("jsonwebtoken");

const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 16) {
  throw new Error(
    "JWT_SECRET absente ou trop courte (16 caractères minimum) : vérifiez backend/.env",
  );
}

// On impose l'algorithme : empêche l'attaque "alg: none".
const ALGORITHM = "HS256";

function signToken(utilisateur) {
  return jwt.sign(
    { sub: String(utilisateur._id), role: utilisateur.role },
    secret,
    { algorithm: ALGORITHM, expiresIn: process.env.JWT_EXPIRES_IN || "1d" },
  );
}

// Lève JsonWebTokenError / TokenExpiredError si invalide (gérées par errorHandler -> 401)
function verifyToken(token) {
  return jwt.verify(token, secret, { algorithms: [ALGORITHM] });
}

module.exports = { signToken, verifyToken };
