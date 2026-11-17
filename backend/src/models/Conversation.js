/* =====================================================================
   src/models/Conversation.js  ->  collection "conversations"
   Composition : Correspondance 1 -> 0..1 Conversation
   (une seule conversation par correspondance, garantie par l'index
   unique du script sur correspondanceId)
   "active" : à vérifier avec l'autre groupe.
   ===================================================================== */

const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    correspondanceId: { type: mongoose.Schema.Types.ObjectId, ref: "Correspondance", required: true },
    dateConversation: { type: Date, default: Date.now },
    active:           { type: Boolean, default: true }
  },
  { collection: "conversations", versionKey: false }
);

module.exports = mongoose.model("Conversation", conversationSchema);
