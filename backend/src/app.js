/* =====================================================================
   src/app.js
   ---------------------------------------------------------------------
   Construit l'application Express : middlewares, routes, erreurs.
   ===================================================================== */

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const routes = require("./routes");
const { notFound, errorHandler } = require("./middlewares/errorHandler");
const { apiLimiter } = require("./middlewares/rateLimiter");

const app = express();

// 0) SÉCURITÉ : en-têtes HTTP protecteurs (helmet) -> binôme 1
app.use(helmet());

// 1) CORS
app.use(cors());

// 2) Lecture du JSON des requêtes (limite de taille contre les abus)
app.use(express.json({ limit: "1mb" }));

// 3) Toutes les routes de l'API sont préfixées par /api
//    (apiLimiter : limite le nombre de requêtes par IP)
app.use("/api", apiLimiter, routes);

// 4) Route inconnue -> erreur 404 au format commun
app.use(notFound);

// 5) Gestionnaire d'erreurs : TOUJOURS en dernier
app.use(errorHandler);

module.exports = app;