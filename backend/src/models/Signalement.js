/* =====================================================================
   src/models/Signalement.js  ->  collection "signalements"
   Relations : declarationId (cible), membreId (dépose),
               adminId (effectue : null tant que non traité)
   Un signalement est "non traité" tant que dateTraitement vaut null.
   ===================================================================== */

const mongoose = require("mongoose");
const { MOTIF_SIGNALEMENT } = require("../constants/enums");

const signalementSchema = new mongoose.Schema(
  {
    declarationId: { type: mongoose.Schema.Types.ObjectId, ref: "Declaration", required: true },
    membreId:      { type: mongoose.Schema.Types.ObjectId, ref: "Utilisateur", required: true },
    adminId:       { type: mongoose.Schema.Types.ObjectId, ref: "Utilisateur", default: null },

    motif:        { type: String, enum: MOTIF_SIGNALEMENT, required: true },
    description:  { type: String, required: true, trim: true },
    dateCreation: { type: Date, default: Date.now },
    dateTraitement: { type: Date, default: null }
  },
  { collection: "signalements", versionKey: false }
);

module.exports = mongoose.model("Signalement", signalementSchema);
