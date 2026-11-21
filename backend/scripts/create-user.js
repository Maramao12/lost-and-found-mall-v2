/* =====================================================================
   backend/scripts/create-user.js
   ---------------------------------------------------------------------
   Crée (ou met à jour) un compte avec un VRAI mot de passe haché.
   Sert à :
     - créer le premier ADMIN (l'inscription publique crée des MEMBRES)
     - donner un vrai mot de passe aux comptes de démo du script Mongo
       (leurs hash sont factices : on ne pourrait pas se connecter)

   Usage (depuis le dossier backend) :
     npm run create-user -- <email> <motDePasse> [ADMIN|MEMBRE] [nom] [prenom]
   Exemple :
     npm run create-user -- admin@lostfound.tn Admin12345 ADMIN BenAli Karim
   ===================================================================== */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const Utilisateur = require("../src/models/Utilisateur");

async function main() {
  const args = process.argv.slice(2);
  const email = (args[0] || "").trim().toLowerCase();
  const motDePasse = args[1] || "";
  const role = (args[2] || "MEMBRE").toUpperCase();
  const nom = args[3] || "Utilisateur";
  const prenom = args[4] || "Test";

  if (!email || motDePasse.length < 8 || ["ADMIN", "MEMBRE"].indexOf(role) === -1) {
    console.error("Usage : npm run create-user -- <email> <motDePasse (8+)> [ADMIN|MEMBRE] [nom] [prenom]");
    process.exit(1);
  }
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI absente : créez backend/.env à partir de .env.example");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const hash = await bcrypt.hash(motDePasse, 12);
  const utilisateur = await Utilisateur.findOneAndUpdate(
    { email: email },
    {
      $set: { motDePasseHash: hash, role: role, actif: true, dateChangementMdp: new Date() },
      $setOnInsert: { nom: nom, prenom: prenom, email: email, dateCreation: new Date() }
    },
    { upsert: true, new: true }
  );

  console.log("OK : " + utilisateur.email + " (" + utilisateur.role + ")");
  await mongoose.disconnect();
}

main().catch(function (err) {
  console.error("Erreur :", err.message);
  process.exit(1);
});