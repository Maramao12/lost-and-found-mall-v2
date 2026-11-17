/* =====================================================================
   src/server.js
   ---------------------------------------------------------------------
   Point d'entrée : lance avec "npm run dev" (ou "npm start").
   Ordre : 1) charger .env  2) connecter MongoDB  3) démarrer Express.
   ===================================================================== */

// 1) Charge les variables du fichier backend/.env dans process.env.
//    DOIT être fait avant tout le reste.
require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 3000;

async function demarrer() {
  try {
    // 2) Connexion à la base
    await connectDB();

    // 3) Démarrage du serveur HTTP
    app.listen(PORT, function () {
      console.log("Serveur démarré : http://localhost:" + PORT);
      console.log("Test : http://localhost:" + PORT + "/api/health");
    });
  } catch (err) {
    // Si MongoDB est inaccessible, on arrête avec un message clair
    console.error("Démarrage impossible :", err.message);
    process.exit(1);
  }
}

demarrer();
