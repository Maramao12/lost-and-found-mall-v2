require("dotenv").config();

const mongoose = require("mongoose");

require("../src/models/Categorie");
require("../src/models/Zone");

const { searchCategories } = require("../src/services/categorySearch.service");

const { searchZones } = require("../src/services/zoneSearch.service");

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

async function main() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connexion MongoDB réussie !");

    console.log("\n===== TRI ALPHABÉTIQUE DES CATÉGORIES =====");

    const categories = await searchCategories(
      {},
      { sort: "nom_asc", limit: 100 },
    );

    categories.data.forEach((categorie, index) => {
      console.log(`${index + 1}. ${categorie.nom}`);
    });

    console.log("\n===== TRI ALPHABÉTIQUE DES ZONES =====");

    const zones = await searchZones({}, { sort: "nom_asc", limit: 100 });

    zones.data.forEach((zone, index) => {
      console.log(`${index + 1}. ${zone.nom}`);
    });

    console.log("\n===== TRI DÉCROISSANT =====");

    const categoriesDesc = await searchCategories(
      {},
      { sort: "nom_desc", limit: 100 },
    );

    console.log("Catégories décroissantes :");
    categoriesDesc.data.forEach((c) => console.log(c.nom));

    const zonesDesc = await searchZones({}, { sort: "nom_desc", limit: 100 });

    console.log("Zones décroissantes :");
    zonesDesc.data.forEach((z) => console.log(z.nom));
  } catch (error) {
    console.error("Erreur :", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\nConnexion MongoDB fermée.");
  }
}

main();
