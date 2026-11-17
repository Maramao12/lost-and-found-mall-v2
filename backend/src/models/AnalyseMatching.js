/* =====================================================================
   src/models/AnalyseMatching.js  ->  collection "analyses_matching"
   Les attributs sont à vérifier (voir le diagramme).
   Chaque score est compris entre 0 et 1.
   ===================================================================== */

const mongoose = require("mongoose");

// Définition réutilisable d'un score borné entre 0 et 1
const score = { type: Number, required: true, min: 0, max: 1 };

const analyseMatchingSchema = new mongoose.Schema(
  {
    scorePhoto:     score,
    scoreTexte:     score,
    scoreLieu:      score,
    scoreDate:      score,
    scoreCategorie: score,
    modeleImage:    { type: String, trim: true },   // ex : "resnet50"
    modeleTexte:    { type: String, trim: true },   // ex : "sentence-bert"
    dateAnalyse:    { type: Date, default: Date.now }
  },
  { collection: "analyses_matching", versionKey: false }
);

module.exports = mongoose.model("AnalyseMatching", analyseMatchingSchema);
