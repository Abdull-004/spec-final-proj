const express = require('express');
const router = express.Router();
const {
  newTrade,
  myTrades,
  getTrade,
  updateTrade,
  rateTrade
} = require('../controllers/tradeController');
const { isAuthenticatedUser } = require('../middlewares/auth');

router.route('/trade/new').post(isAuthenticatedUser, newTrade);
router.route('/trades/me').get(isAuthenticatedUser, myTrades);
router.route('/trade/:id')
  .get(isAuthenticatedUser, getTrade)
  .put(isAuthenticatedUser, updateTrade);
router.route('/trade/rate/:id').post(isAuthenticatedUser, rateTrade);

module.exports = router;