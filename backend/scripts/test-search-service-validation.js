require("dotenv").config();
const mongoose = require("mongoose");

// Enregistrer les modèles utilisés par populate()
require("../src/models/Declaration");
require("../src/models/Categorie");
require("../src/models/Zone");
require("../src/models/Utilisateur");

const { searchDeclarations } = require("../src/services/search.service");

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

let totalTests = 0;
let testsReussis = 0;
let testsEchoues = 0;

async function testerErreur(nom, fonction, messageAttendu) {
  totalTests++;

  try {
    await fonction();

    console.log(`[ECHEC] ${nom}`);
    console.log(
      "Une erreur était attendue, mais aucune erreur n'a été déclenchée.",
    );
    testsEchoues++;
  } catch (error) {
    if (error.message.includes(messageAttendu)) {
      console.log(`[OK] ${nom}`);
      console.log("Erreur correctement détectée :", error.message);
      testsReussis++;
    } else {
      console.log(`[ECHEC] ${nom}`);
      console.log("Erreur inattendue :", error.message);
      testsEchoues++;
    }
  }
}

async function main() {
  try {
    if (!MONGO_URI) {
      throw new Error("URI MongoDB introuvable dans le fichier .env");
    }

    await mongoose.connect(MONGO_URI);
    console.log("Connexion MongoDB réussie !");

    console.log("\n========================================");
    console.log("TESTS DE VALIDATION : SEARCH SERVICE");
    console.log("========================================");

    // 1. Type invalide
    await testerErreur(
      "Refuser un type invalide",
      () => searchDeclarations({ type: "VOL" }),
      "Type invalide",
    );

    // 2. Statut invalide
    await testerErreur(
      "Refuser un statut invalide",
      () => searchDeclarations({ statut: "INCONNU" }),
      "Statut de déclaration invalide",
    );

    // 3. Catégorie avec ObjectId invalide
    await testerErreur(
      "Refuser un categorieId invalide",
      () => searchDeclarations({ categorieId: "12345" }),
      "categorieId doit être un identifiant MongoDB valide",
    );

    // 4. Zone avec ObjectId invalide
    await testerErreur(
      "Refuser un zoneId invalide",
      () => searchDeclarations({ zoneId: "abc123" }),
      "zoneId doit être un identifiant MongoDB valide",
    );

    // 5. Date de début avec mauvais format
    await testerErreur(
      "Refuser une dateDebut au mauvais format",
      () => searchDeclarations({ dateDebut: "17/11/2026" }),
      "dateDebut doit respecter le format YYYY-MM-DD",
    );

    // 6. Date de fin avec mauvais format
    await testerErreur(
      "Refuser une dateFin au mauvais format",
      () => searchDeclarations({ dateFin: "2026/11/17" }),
      "dateFin doit respecter le format YYYY-MM-DD",
    );

    // 7. Date impossible
    await testerErreur(
      "Refuser une date inexistante",
      () => searchDeclarations({ dateDebut: "2026-02-30" }),
      "dateDebut n'est pas une date valide",
    );

    // 8. Date de début supérieure à date de fin
    await testerErreur(
      "Refuser une période de dates incohérente",
      () =>
        searchDeclarations({
          dateDebut: "2026-11-20",
          dateFin: "2026-11-10",
        }),
      "La date de début doit être antérieure ou égale",
    );

    // 9. Page égale à zéro
    await testerErreur(
      "Refuser une page égale à zéro",
      () => searchDeclarations({}, { page: 0 }),
      "La page doit être un entier supérieur ou égal à 1",
    );

    // 10. Page négative
    await testerErreur(
      "Refuser une page négative",
      () => searchDeclarations({}, { page: -1 }),
      "La page doit être un entier supérieur ou égal à 1",
    );

    // 11. Limite égale à zéro
    await testerErreur(
      "Refuser une limite égale à zéro",
      () => searchDeclarations({}, { limit: 0 }),
      "La limite doit être comprise entre 1 et 100",
    );

    // 12. Limite supérieure à 100
    await testerErreur(
      "Refuser une limite supérieure à 100",
      () => searchDeclarations({}, { limit: 101 }),
      "La limite doit être comprise entre 1 et 100",
    );

    // 13. Tri invalide
    await testerErreur(
      "Refuser un tri invalide",
      () => searchDeclarations({}, { sort: "alphabetique" }),
      "Tri invalide",
    );

    // 14. Page non entière
    await testerErreur(
      "Refuser une page décimale",
      () => searchDeclarations({}, { page: 1.5 }),
      "La page doit être un entier supérieur ou égal à 1",
    );

    // 15. Limite non entière
    await testerErreur(
      "Refuser une limite décimale",
      () => searchDeclarations({}, { limit: 2.5 }),
      "La limite doit être comprise entre 1 et 100",
    );

    console.log("\n========================================");
    console.log("RÉSUMÉ DES TESTS");
    console.log("========================================");

    console.log("Nombre total de tests :", totalTests);
    console.log("Tests réussis :", testsReussis);
    console.log("Tests échoués :", testsEchoues);

    if (testsEchoues === 0) {
      console.log("\nTous les tests de validation sont réussis !");
    } else {
      console.log("\nCertains tests nécessitent une correction.");
    }
  } catch (error) {
    console.error("\nErreur générale :", error.message);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    console.log("\nConnexion MongoDB fermée.");
  }
}

main();
