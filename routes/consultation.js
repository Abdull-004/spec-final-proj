const express = require('express');
const router = express.Router();
const {
  newConsultation,
  myConsultations,
  getConsultation,
  updateConsultation,
  rateConsultation
} = require('../controllers/consultationController');
const { isAuthenticatedUser } = require('../middlewares/auth');

router.route('/consultation/new').post(isAuthenticatedUser, newConsultation);
router.route('/consultations/me').get(isAuthenticatedUser, myConsultations);
router.route('/consultation/:id')
  .get(isAuthenticatedUser, getConsultation)
  .put(isAuthenticatedUser, updateConsultation);
router.route('/consultation/rate/:id').post(isAuthenticatedUser, rateConsultation);

module.exports = router;