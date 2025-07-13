const express = require('express');
const router = express.Router();
const {
  getUserProfile,
  updateProfile,
  allUsers,
  getUserDetails,
  searchUsers,
  rateUser
} = require('../controllers/userController');
const { isAuthenticatedUser, authorizeRoles } = require('../middlewares/auth');

router.route('/me').get(isAuthenticatedUser, getUserProfile);
router.route('/me/update').put(isAuthenticatedUser, updateProfile);
router.route('/users/search').get(isAuthenticatedUser, searchUsers);
router.route('/users/rate/:id').post(isAuthenticatedUser, rateUser);

// Admin routes
router.route('/admin/users').get(isAuthenticatedUser, authorizeRoles('admin'), allUsers);
router.route('/admin/user/:id').get(isAuthenticatedUser, authorizeRoles('admin'), getUserDetails);

module.exports = router;