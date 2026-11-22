/* =====================================================================
   src/utils/asyncHandler.js
   ---------------------------------------------------------------------
   Express 4 n'attrape PAS les erreurs des fonctions async : sans ce
   wrapper, un "throw" dans un contrôleur planterait la requête.
   Usage dans les routes :
       router.get("/", asyncHandler(controller.liste));
   Toute erreur est transmise à errorHandler.js (réponse JSON cohérente).
   ===================================================================== */

module.exports = function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
