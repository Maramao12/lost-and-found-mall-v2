const lf = db.getSiblingDB("lostfound");
const now = new Date();
const jours = (n) => new Date(now.getTime() - n * 24 * 3600 * 1000);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

// Nettoyage des anciennes données de test
const anciens = lf.utilisateurs
  .find({ email: /@test\.anomaly$/ })
  .toArray()
  .map((u) => u._id);
lf.declarations.deleteMany({ auteurId: { $in: anciens } });
lf.utilisateurs.deleteMany({ _id: { $in: anciens } });

const catNoms = [
  "Téléphones",
  "Portefeuilles",
  "Clés",
  "Montres",
  "Sacs",
  "Lunettes",
];
const zoneNoms = [
  "Food court",
  "Parking",
  "Entrée principale",
  "Zone A",
  "Zone B",
  "Cinéma",
];
catNoms.forEach((nom) =>
  lf.categories.updateOne(
    { nom },
    { $setOnInsert: { nom, description: nom } },
    { upsert: true },
  ),
);
zoneNoms.forEach((nom) =>
  lf.zones.updateOne(
    { nom },
    { $setOnInsert: { nom, description: nom } },
    { upsert: true },
  ),
);
const cats = lf.categories.find({ nom: { $in: catNoms } }).toArray();
const zones = lf.zones.find({ nom: { $in: zoneNoms } }).toArray();

function creerMembre(prenom, nom, email) {
  return lf.utilisateurs.insertOne({
    nom,
    prenom,
    email,
    motDePasseHash: "$2b$10$FAUXHASHTEST",
    actif: true,
    dateCreation: jours(30),
    role: "MEMBRE",
  }).insertedId;
}
function creerDeclaration(auteurId, cat, zone, joursAvant, i) {
  lf.declarations.insertOne({
    type: "PERDU",
    titre: "Objet perdu " + cat.nom + " " + i,
    description: "Declaration de test pour l'analyse d'anomalies",
    statut: "PUBLIEE",
    auteurId,
    categorieId: cat._id,
    zoneId: zone._id,
    dateEvenement: jours(joursAvant + 1),
    dateCreation: jours(joursAvant),
    dateModification: jours(joursAvant),
  });
}

// 30 membres normaux : 1 ou 2 déclarations
for (let i = 1; i <= 30; i++) {
  const n = 1 + Math.floor(Math.random() * 2);
  const id = creerMembre("User" + i, "Test", "user" + i + "@test.anomaly");
  for (let k = 0; k < n; k++)
    creerDeclaration(
      id,
      pick(cats),
      pick(zones),
      Math.floor(Math.random() * 5),
      k,
    );
}

// Ahmed : 12 déclarations, 6 catégories et 6 zones différentes
const idAhmed = creerMembre("Ahmed", "Malveillant", "ahmed@test.anomaly");
for (let k = 0; k < 12; k++)
  creerDeclaration(idAhmed, cats[k % 6], zones[k % 6], k % 5, k);

print("Donnees de test creees : 30 membres normaux + Ahmed.");
