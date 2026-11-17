/* =====================================================================
   src/models/Notification.js  ->  collection "notifications"
   Relation : utilisateurId (destinataire, Utilisateur reçoit 0..*)
   ===================================================================== */

const mongoose = require("mongoose");
const { TYPE_NOTIFICATION } = require("../constants/enums");

const notificationSchema = new mongoose.Schema(
  {
    utilisateurId: { type: mongoose.Schema.Types.ObjectId, ref: "Utilisateur", required: true },
    titre:         { type: String, required: true, trim: true },
    message:       { type: String, required: true, trim: true },
    type:          { type: String, enum: TYPE_NOTIFICATION, required: true },
    dateCreation:  { type: Date, default: Date.now },
    lue:           { type: Boolean, default: false },
    dateLecture:   { type: Date, default: null }
  },
  { collection: "notifications", versionKey: false }
);

module.exports = mongoose.model("Notification", notificationSchema);
