function fakeEvents() {
  const cats = [
    "Téléphone",
    "Portefeuille",
    "Clés",
    "Montre",
    "Sac",
    "Lunettes",
  ];
  const zones = [
    "Food court",
    "Parking",
    "Cinéma",
    "Zone A",
    "Zone B",
    "Entrée",
  ];
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const events = [];
  let oid = 0;

  // 30 utilisateurs normaux : 1 à 2 réclamations
  for (let i = 0; i < 30; i++) {
    const n = 1 + Math.floor(Math.random() * 2);
    for (let k = 0; k < n; k++) {
      events.push({
        user_id: `u${i}`,
        user_name: `User${i}`,
        object_id: `o${++oid}`,
        action: "claimed",
        category: pick(cats),
        zone: pick(zones),
      });
    }
  }

  // Ahmed : 12 réclamations très variées
  for (let k = 0; k < 12; k++) {
    events.push({
      user_id: "ahmed",
      user_name: "Ahmed",
      object_id: `o${++oid}`,
      action: "claimed",
      category: pick(cats),
      zone: pick(zones),
    });
  }
  return events;
}

module.exports = { fakeEvents };
