/* =====================================================================
   src/models/Declaration.js  ->  collection "declarations"
   Relations : auteurId (Membre crée), categorieId (appartient à),
               zoneId (concerne)
   ===================================================================== */

const mongoose = require("mongoose");
const { TYPE_DECLARATION, STATUT_DECLARATION } = require("../constants/enums");

const declarationSchema = new mongoose.Schema(
  {
    type:        { type: String, enum: TYPE_DECLARATION, required: true },
    titre:       { type: String, required: true, trim: true, minlength: 3, maxlength: 120 },
    description: { type: String, required: true, trim: true, minlength: 5 },
    dateCreation:     { type: Date, default: Date.now },
    photoUrl:         { type: String, trim: true },               // optionnel
    statut:           { type: String, enum: STATUT_DECLARATION, default: "PUBLIEE" },
    dateModification: { type: Date, default: Date.now },

    // ref : permet .populate("zoneId") pour récupérer le document lié
    auteurId:    { type: mongoose.Schema.Types.ObjectId, ref: "Utilisateur", required: true },
    categorieId: { type: mongoose.Schema.Types.ObjectId, ref: "Categorie",   required: true },
    zoneId:      { type: mongoose.Schema.Types.ObjectId, ref: "Zone",        required: true }
  },
  { collection: "declarations", versionKey: false }
);

module.exports = mongoose.model("Declaration", declarationSchema);
