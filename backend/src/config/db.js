/* =====================================================================
   src/config/db.js
   ---------------------------------------------------------------------
   Connexion à MongoDB (la base "lostfound" créée avec le script).
   ===================================================================== */

const mongoose = require("mongoose");

async function connectDB() {
  // 1) On lit l'adresse dans le fichier .env (jamais écrite en dur)
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI est absente : créez backend/.env à partir de .env.example");
  }

  // 2) Refuse les filtres de recherche inconnus (plus sûr)
  mongoose.set("strictQuery", true);

  // 3) Connexion.
  //    autoIndex:false  -> Mongoose NE crée PAS d'index tout seul.
  //    autoCreate:false -> Mongoose NE crée PAS les collections tout seul.
  //    Pourquoi ? Les collections, validateurs et index sont gérés par le
  //    script database/lostfound_mongo.js. Si Mongoose recréait les siens,
  //    il pourrait entrer en conflit avec ceux du script.
  await mongoose.connect(uri, { autoIndex: false, autoCreate: false });

  console.log("MongoDB connecté : " + mongoose.connection.name);
}

module.exports = connectDB;
