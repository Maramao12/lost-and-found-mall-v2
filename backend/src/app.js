/* =====================================================================
   src/app.js
   ---------------------------------------------------------------------
   Construit l'application Express : middlewares, routes, erreurs.
   
   ===================================================================== */

const express = require("express");
const cors = require("cors");

const routes = require("./routes");
const { notFound, errorHandler } = require("./middlewares/errorHandler");

const app = express();

// 1) CORS : autorise le frontend React (autre port) à appeler l'API
app.use(cors());

// 2) Lecture du JSON des requêtes (limite de taille contre les abus)
app.use(express.json({ limit: "1mb" }));

// 3) Toutes les routes de l'API sont préfixées par /api
app.use("/api", routes);

// 4) Route inconnue -> erreur 404 au format commun
app.use(notFound);

// 5) Gestionnaire d'erreurs : TOUJOURS en dernier
app.use(errorHandler);

module.exports = app;
