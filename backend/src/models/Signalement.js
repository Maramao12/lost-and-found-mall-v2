/*
 * Signalement.js
 * Modèle des signalements effectués par les membres.
 *
 * Le Binôme 1 gère la création du signalement.
 * Le Binôme 4 gère son traitement administratif.
 */

const mongoose = require("mongoose");
const { MOTIF_SIGNALEMENT } = require("../constants/enums");

// Décisions possibles après examen d'un signalement.
const DECISION_SIGNALEMENT = [
  "NON_JUSTIFIE",
  "JUSTIFIE_MAINTENIR",
  "JUSTIFIE_MASQUER",
];

const signalementSchema = new mongoose.Schema(
  {
    // Déclaration concernée par le signalement.
    declarationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Declaration",
      required: true,
    },

    // Membre qui a envoyé le signalement.
    membreId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Utilisateur",
      required: true,
    },

    // Administrateur qui a traité le signalement.
    // Null tant que le signalement n'est pas traité.
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Utilisateur",
      default: null,
    },

    motif: {
      type: String,
      enum: MOTIF_SIGNALEMENT,
      required: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    dateCreation: {
      type: Date,
      default: Date.now,
    },

    // Null = signalement en attente.
    // Date renseignée = signalement traité.
    dateTraitement: {
      type: Date,
      default: null,
    },

    // Décision prise par l'administrateur.
    decision: {
      type: String,
      enum: ["NON_JUSTIFIE", "JUSTIFIE_MAINTENIR", "JUSTIFIE_MASQUER"],
      default: null,
    },

    commentaireAdmin: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    collection: "signalements",
    versionKey: false,
  },
);

module.exports = mongoose.model("Signalement", signalementSchema);
