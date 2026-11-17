/* =====================================================================
   src/models/Message.js  ->  collection "messages"
   Relations : conversationId (Conversation contient 0..* Message),
               expediteurId (Membre expéditeur)
   ===================================================================== */

const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true },
    expediteurId:   { type: mongoose.Schema.Types.ObjectId, ref: "Utilisateur",  required: true },
    contenu:        { type: String, required: true, trim: true, minlength: 1, maxlength: 2000 },
    dateEnvoi:      { type: Date, default: Date.now },
    lu:             { type: Boolean, default: false }
  },
  { collection: "messages", versionKey: false }
);

module.exports = mongoose.model("Message", messageSchema);
