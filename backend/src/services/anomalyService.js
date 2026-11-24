const { isolationForestScores } = require("./isolationForest");

// 1) Construction du graphe
function buildGraph(events) {
  const nodes = new Map();
  const adj = new Map();
  const links = [];

  const addNode = (id, type, label) => {
    if (!nodes.has(id)) {
      nodes.set(id, { id, type, label });
      adj.set(id, new Set());
    }
  };
  const addEdge = (a, b) => {
    if (!adj.get(a).has(b)) {
      adj.get(a).add(b);
      adj.get(b).add(a);
      links.push({ source: a, target: b });
    }
  };

  const claims = new Map();

  for (const e of events) {
    const u = `user:${e.user_id}`;
    const o = `obj:${e.object_id}`;
    const z = `zone:${e.zone}`;

    addNode(u, "user", e.user_name);
    addNode(o, "object", e.category);
    addNode(z, "zone", e.zone);
    addEdge(u, o);
    addEdge(o, z);

    if (e.action === "claimed") {
      if (!claims.has(u)) {
        claims.set(u, {
          objects: new Set(),
          categories: new Set(),
          zones: new Set(),
        });
      }
      const cl = claims.get(u);
      cl.objects.add(o);
      cl.categories.add(e.category);
      cl.zones.add(e.zone);
    }
  }
  return { nodes, adj, links, claims };
}

// densité du voisinage (rayon 2)
function egoDensity(adj, start) {
  const ego = new Set([start]);
  for (const n of adj.get(start)) {
    ego.add(n);
    for (const m of adj.get(n)) ego.add(m);
  }
  let edges = 0;
  for (const a of ego) for (const b of adj.get(a)) if (ego.has(b)) edges++;
  edges /= 2;
  const n = ego.size;
  return n < 2 ? 0 : (2 * edges) / (n * (n - 1));
}

// 2) Métriques + 3) Détection
function analyze(events, threshold = 0.6) {
  const { nodes, adj, links, claims } = buildGraph(events);
  const N = nodes.size;

  const users = [...nodes.values()].filter((n) => n.type === "user");
  if (users.length < 5) return { users: [], graph: { nodes: [], links: [] } };

  const rows = users.map((u) => {
    const degree = adj.get(u.id).size;
    const cl = claims.get(u.id);
    return {
      id: u.id,
      name: u.label,
      degree,
      centrality: degree / (N - 1),
      density: egoDensity(adj, u.id),
      nbClaims: cl ? cl.objects.size : 0,
      nbCategories: cl ? cl.categories.size : 0,
      nbZones: cl ? cl.zones.size : 0,
    };
  });

  const X = rows.map((r) => [
    r.degree,
    r.centrality,
    r.density,
    r.nbClaims,
    r.nbCategories,
    r.nbZones,
  ]);
  const scores = isolationForestScores(X);

  const anomalous = new Set();
  const result = rows.map((r, i) => {
    const isAnomaly = scores[i] >= threshold;
    if (isAnomaly) anomalous.add(r.id);
    return {
      user_id: r.id.split(":")[1],
      name: r.name,
      score: Number(scores[i].toFixed(2)),
      is_anomaly: isAnomaly,
      degree: r.degree,
      nb_claims: r.nbClaims,
      nb_categories: r.nbCategories,
      nb_zones: r.nbZones,
    };
  });
  result.sort((a, b) => b.score - a.score);

  // format prêt pour D3.js
  const graph = {
    nodes: [...nodes.values()].map((n) => ({
      ...n,
      anomaly: anomalous.has(n.id),
    })),
    links,
  };
  return { users: result, graph };
}

module.exports = { analyze };
