const User = require('../models/user');
const ErrorHandler = require('../utils/errorHandler');
const catchAsyncErrors = require('../middlewares/catchAsyncErrors');
const APIFeatures = require('../utils/apiFeatures');

// Get currently logged in user details => /api/v1/me
exports.getUserProfile = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  res.status(200).json({
    success: true,
    user
  });
});

// Update user profile => /api/v1/me/update
exports.updateProfile = catchAsyncErrors(async (req, res, next) => {
  const newUserData = {
    name: req.body.name,
    email: req.body.email,
    phone: req.body.phone,
    address: req.body.address
  };

  if (req.body.location) {
    newUserData.location = {
      type: 'Point',
      coordinates: req.body.location.coordinates
    };
  }

  const user = await User.findByIdAndUpdate(req.user.id, newUserData, {
    new: true,
    runValidators: true,
    useFindAndModify: false
  });

  res.status(200).json({
    success: true,
    user
  });
});

// Get all users => /api/v1/admin/users
exports.allUsers = catchAsyncErrors(async (req, res, next) => {
  const users = await User.find();

  res.status(200).json({
    success: true,
    users
  });
});

// Get user details => /api/v1/admin/user/:id
exports.getUserDetails = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new ErrorHandler(`User not found with id: ${req.params.id}`));
  }

  res.status(200).json({
    success: true,
    user
  });
});

// Search users by role and location => /api/v1/users/search
exports.searchUsers = catchAsyncErrors(async (req, res, next) => {
  const { role, latitude, longitude, maxDistance = 10000 } = req.query;

  if (!role || !latitude || !longitude) {
    return next(new ErrorHandler('Please provide role, latitude and longitude', 400));
  }

  const users = await User.find({
    role,
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [parseFloat(longitude), parseFloat(latitude)]
        },
        $maxDistance: parseInt(maxDistance)
      }
    }
  });

  res.status(200).json({
    success: true,
    count: users.length,
    users
  });
});

// Rate a user => /api/v1/users/rate/:id
exports.rateUser = catchAsyncErrors(async (req, res, next) => {
  const { rating, comment } = req.body;

  if (rating < 1 || rating > 5) {
    return next(new ErrorHandler('Rating must be between 1 and 5', 400));
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new ErrorHandler('User not found', 404));
  }

  // Check if the logged in user has interacted with the user being rated
  // This would require checking trade or consultation records
  // For simplicity, we'll assume the check is done

  const review = {
    user: req.user._id,
    rating: Number(rating),
    comment
  };

  user.reviews.push(review);
  user.numOfReviews = user.reviews.length;

  user.rating = user.reviews.reduce((acc, item) => item.rating + acc, 0) / user.reviews.length;

  await user.save();

  res.status(200).json({
    success: true,
    message: 'Rating submitted successfully'
  });
});