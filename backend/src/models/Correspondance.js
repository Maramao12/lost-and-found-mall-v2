/* =====================================================================
   src/models/Correspondance.js  ->  collection "correspondances"
   Relations :
     - declarationPerdueId / declarationTrouveeId -> Declaration
     - analyseId : une analyse propose 0..* correspondances, une
       correspondance est le résultat d'UNE seule analyse
   ===================================================================== */

const mongoose = require("mongoose");
const { STATUT_CORRESPONDANCE } = require("../constants/enums");

const correspondanceSchema = new mongoose.Schema(
  {
    declarationPerdueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Declaration",
      required: true,
    },
    declarationTrouveeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Declaration",
      required: true,
    },
    analyseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AnalyseMatching",
      required: true,
    },

    scoreGlobal: { type: Number, required: true, min: 0, max: 1 },
    statut: { type: String, enum: STATUT_CORRESPONDANCE, default: "PROPOSEE" },
    dateCreation: { type: Date, default: Date.now },
    dateMiseAJour: { type: Date, default: Date.now },
  },
  { collection: "correspondances", versionKey: false },
);

module.exports = mongoose.model("Correspondance", correspondanceSchema);
