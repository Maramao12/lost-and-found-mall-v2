/* =====================================================================
   src/controllers/admin.controller.js
   ---------------------------------------------------------------------
   Contrôleur Binôme 4 - Personne 1
   Signalements et modération
   ===================================================================== */

const adminService = require("../services/admin.service");

// ---------------------------------------------------------------------
// F1 + F2
// GET /api/admin/reports
// ---------------------------------------------------------------------
async function listReports(req, res) {
  const resultat = await adminService.getReports(req.query);

  res.json({
    success: true,
    data: resultat.data,
    pagination: resultat.pagination,
  });
}

// ---------------------------------------------------------------------
// F3
// GET /api/admin/reports/:id
// ---------------------------------------------------------------------
async function getReport(req, res) {
  const signalement = await adminService.getReportById(req.params.id);

  res.json({
    success: true,
    data: { signalement },
  });
}

// ---------------------------------------------------------------------
// F4 + F5 + F11
// PATCH /api/admin/reports/:id/resolve
// ---------------------------------------------------------------------
async function resolveReport(req, res) {
  const resultat = await adminService.resolveReport(
    req.params.id,
    req.user._id,
    req.body,
  );

  res.json({
    success: true,
    data: resultat,
  });
}

// ---------------------------------------------------------------------
// F6 + F7
// GET /api/admin/declarations
// ---------------------------------------------------------------------
async function listDeclarations(req, res) {
  const resultat = await adminService.getDeclarations(req.query);

  res.json({
    success: true,
    data: resultat.data,
    pagination: resultat.pagination,
  });
}

// ---------------------------------------------------------------------
// F8 + F9 + F10 + F11
// PATCH /api/admin/declarations/:id/moderation
// ---------------------------------------------------------------------
async function moderateDeclaration(req, res) {
  const declaration = await adminService.moderateDeclaration(
    req.params.id,
    req.user._id,
    req.body,
  );

  res.json({
    success: true,
    data: { declaration },
  });
}
// =====================================================================
// F12 : LISTE DES UTILISATEURS
// GET /api/admin/users
// =====================================================================

async function listUsers(req, res) {
  const resultat = await adminService.getUsers(req.query);

  res.json({
    success: true,
    data: resultat.data,
    pagination: resultat.pagination,
  });
}

// =====================================================================
// F13 : SUSPENDRE / REACTIVER UN UTILISATEUR
// PATCH /api/admin/users/:id/status
// =====================================================================

async function updateUserStatus(req, res) {
  const utilisateur = await adminService.updateUserStatus(
    req.params.id,
    req.body.actif,
    req.user._id,
  );

  res.json({
    success: true,
    message: req.body.actif
      ? "Utilisateur réactivé avec succès"
      : "Utilisateur suspendu avec succès",
    data: { utilisateur },
  });
}
// ---------------------------------------------------------------------
// EXPORT
// ---------------------------------------------------------------------
module.exports = {
  listReports,
  getReport,
  resolveReport,
  listDeclarations,
  moderateDeclaration,

  // Gestion des utilisateurs
  listUsers,
  updateUserStatus,
};
