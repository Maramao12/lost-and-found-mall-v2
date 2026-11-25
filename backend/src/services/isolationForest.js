const EULER = 0.5772156649;

// longueur moyenne d'un chemin dans un arbre de n éléments
function c(n) {
  if (n <= 1) return 0;
  if (n === 2) return 1;
  return 2 * (Math.log(n - 1) + EULER) - (2 * (n - 1)) / n;
}

function buildTree(data, depth, maxDepth) {
  if (depth >= maxDepth || data.length <= 1) return { size: data.length };

  const nbFeatures = data[0].length;
  const q = Math.floor(Math.random() * nbFeatures);
  const values = data.map((row) => row[q]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return { size: data.length };

  const split = min + Math.random() * (max - min);
  return {
    q,
    split,
    left: buildTree(
      data.filter((r) => r[q] < split),
      depth + 1,
      maxDepth,
    ),
    right: buildTree(
      data.filter((r) => r[q] >= split),
      depth + 1,
      maxDepth,
    ),
  };
}

function pathLength(x, node, depth = 0) {
  if (node.size !== undefined) return depth + c(node.size);
  return x[node.q] < node.split
    ? pathLength(x, node.left, depth + 1)
    : pathLength(x, node.right, depth + 1);
}

function sample(data, size) {
  const copy = [...data].sort(() => Math.random() - 0.5);
  return copy.slice(0, size);
}

// score par ligne : proche de 1 = très anormal
function isolationForestScores(data, nTrees = 200) {
  const psi = Math.min(256, data.length);
  const maxDepth = Math.ceil(Math.log2(psi));
  const trees = [];
  for (let i = 0; i < nTrees; i++) {
    trees.push(buildTree(sample(data, psi), 0, maxDepth));
  }
  return data.map((x) => {
    const avg = trees.reduce((s, t) => s + pathLength(x, t), 0) / nTrees;
    return Math.pow(2, -avg / c(psi));
  });
}

module.exports = { isolationForestScores };
