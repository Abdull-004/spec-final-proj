const Consultation = require('../models/consultation');
const User = require('../models/user');
const ErrorHandler = require('../utils/errorHandler');
const catchAsyncErrors = require('../middlewares/catchAsyncErrors');
const sendEmail = require('../utils/sendEmail');

// Create new consultation => /api/v1/consultation/new
exports.newConsultation = catchAsyncErrors(async (req, res, next) => {
  const { veterinarian, subject, description, scheduledAt } = req.body;

  const consultation = await Consultation.create({
    farmer: req.user.id,
    veterinarian,
    subject,
    description,
    scheduledAt
  });

  // Notify veterinarian
  const vet = await User.findById(veterinarian);
  
  if (vet) {
    const message = `You have a new consultation request from ${req.user.name}.\n\nSubject: ${subject}\n\nScheduled for: ${scheduledAt}\n\nPlease login to your account to respond.`;
    
    try {
      await sendEmail({
        email: vet.email,
        subject: 'New Consultation Request',
        message
      });
    } catch (error) {
      console.error('Error sending email:', error);
    }
  }

  res.status(201).json({
    success: true,
    consultation
  });
});

// Get all consultations for current user => /api/v1/consultations/me
exports.myConsultations = catchAsyncErrors(async (req, res, next) => {
  const consultations = await Consultation.find({
    $or: [
      { farmer: req.user.id },
      { veterinarian: req.user.id }
    ]
  })
    .populate('farmer', 'name email avatar')
    .populate('veterinarian', 'name email avatar rating');

  res.status(200).json({
    success: true,
    consultations
  });
});

// Get consultation details => /api/v1/consultation/:id
exports.getConsultation = catchAsyncErrors(async (req, res, next) => {
  const consultation = await Consultation.findById(req.params.id)
    .populate('farmer', 'name email avatar')
    .populate('veterinarian', 'name email avatar rating');

  if (!consultation) {
    return next(new ErrorHandler('Consultation not found', 404));
  }

  // Check if the logged in user is part of this consultation
  if (consultation.farmer._id.toString() !== req.user.id.toString() && 
      consultation.veterinarian._id.toString() !== req.user.id.toString()) {
    return next(new ErrorHandler('Not authorized to access this consultation', 401));
  }

  res.status(200).json({
    success: true,
    consultation
  });
});

// Update consultation status => /api/v1/consultation/:id
exports.updateConsultation = catchAsyncErrors(async (req, res, next) => {
  const { status } = req.body;

  let consultation = await Consultation.findById(req.params.id);

  if (!consultation) {
    return next(new ErrorHandler('Consultation not found', 404));
  }

  // Check if the logged in user is the veterinarian for this consultation
  if (consultation.veterinarian.toString() !== req.user.id.toString()) {
    return next(new ErrorHandler('Not authorized to update this consultation', 401));
  }

  consultation.status = status;

  if (status === 'completed') {
    consultation.completedAt = Date.now();
  }

  await consultation.save();

  res.status(200).json({
    success: true,
    consultation
  });
});

// Rate consultation => /api/v1/consultation/rate/:id
exports.rateConsultation = catchAsyncErrors(async (req, res, next) => {
  const { rating, feedback } = req.body;

  if (rating < 1 || rating > 5) {
    return next(new ErrorHandler('Rating must be between 1 and 5', 400));
  }

  let consultation = await Consultation.findById(req.params.id);

  if (!consultation) {
    return next(new ErrorHandler('Consultation not found', 404));
  }

  // Check if the consultation is completed
  if (consultation.status !== 'completed') {
    return next(new ErrorHandler('You can only rate completed consultations', 400));
  }

  // Check if the logged in user is the farmer for this consultation
  if (consultation.farmer.toString() !== req.user.id.toString()) {
    return next(new ErrorHandler('Not authorized to rate this consultation', 401));
  }

  consultation.farmerRating = rating;
  consultation.farmerFeedback = feedback;

  await consultation.save();

  // Update veterinarian's rating
  await updateUserRating(consultation.veterinarian);

  res.status(200).json({
    success: true,
    message: 'Consultation rated successfully'
  });
});

async function updateUserRating(userId) {
  const consultations = await Consultation.find({
    veterinarian: userId,
    farmerRating: { $exists: true }
  });

  if (consultations.length > 0) {
    const totalRating = consultations.reduce((sum, consultation) => sum + consultation.farmerRating, 0);
    const averageRating = totalRating / consultations.length;

    await User.findByIdAndUpdate(userId, {
      rating: averageRating,
      numOfReviews: consultations.length
    });
  }
}