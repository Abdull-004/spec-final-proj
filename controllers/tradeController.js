const Trade = require('../models/trade');
const Product = require('../models/product');
const User = require('../models/user');
const ErrorHandler = require('../utils/errorHandler');
const catchAsyncErrors = require('../middlewares/catchAsyncErrors');
const sendEmail = require('../utils/sendEmail');

// Create new trade => /api/v1/trade/new
exports.newTrade = catchAsyncErrors(async (req, res, next) => {
  const { product, seller, quantity, price } = req.body;

  // Check product availability
  const productToTrade = await Product.findById(product);
  
  if (!productToTrade) {
    return next(new ErrorHandler('Product not found', 404));
  }

  if (productToTrade.stock < quantity) {
    return next(new ErrorHandler('Not enough stock available', 400));
  }

  const trade = await Trade.create({
    product,
    seller,
    buyer: req.user.id,
    quantity,
    price: price || productToTrade.price * quantity,
    status: 'pending'
  });

  // Notify seller
  const sellerUser = await User.findById(seller);
  
  if (sellerUser) {
    const message = `You have a new trade request from ${req.user.name}.\n\nProduct: ${productToTrade.name}\nQuantity: ${quantity}\nPrice: ${trade.price}\n\nPlease login to your account to respond.`;
    
    try {
      await sendEmail({
        email: sellerUser.email,
        subject: 'New Trade Request',
        message
      });
    } catch (error) {
      console.error('Error sending email:', error);
    }
  }

  res.status(201).json({
    success: true,
    trade
  });
});

// Get all trades for current user => /api/v1/trades/me
exports.myTrades = catchAsyncErrors(async (req, res, next) => {
  const trades = await Trade.find({
    $or: [
      { seller: req.user.id },
      { buyer: req.user.id }
    ]
  })
    .populate('product', 'name price images')
    .populate('seller', 'name email avatar')
    .populate('buyer', 'name email avatar');

  res.status(200).json({
    success: true,
    trades
  });
});

// Get trade details => /api/v1/trade/:id
exports.getTrade = catchAsyncErrors(async (req, res, next) => {
  const trade = await Trade.findById(req.params.id)
    .populate('product', 'name price images')
    .populate('seller', 'name email avatar rating')
    .populate('buyer', 'name email avatar rating');

  if (!trade) {
    return next(new ErrorHandler('Trade not found', 404));
  }

  // Check if the logged in user is part of this trade
  if (trade.seller._id.toString() !== req.user.id.toString() && 
      trade.buyer._id.toString() !== req.user.id.toString()) {
    return next(new ErrorHandler('Not authorized to access this trade', 401));
  }

  res.status(200).json({
    success: true,
    trade
  });
});

// Update trade status => /api/v1/trade/:id
exports.updateTrade = catchAsyncErrors(async (req, res, next) => {
  const { status } = req.body;

  let trade = await Trade.findById(req.params.id)
    .populate('product');

  if (!trade) {
    return next(new ErrorHandler('Trade not found', 404));
  }

  // Check if the logged in user is the seller for this trade
  if (trade.seller.toString() !== req.user.id.toString()) {
    return next(new ErrorHandler('Not authorized to update this trade', 401));
  }

  trade.status = status;

  if (status === 'completed') {
    trade.completedAt = Date.now();
    
    // Update product stock
    const product = await Product.findById(trade.product._id);
    product.stock -= trade.quantity;
    await product.save();
  }

  await trade.save();

  // Notify buyer
  const buyer = await User.findById(trade.buyer);
  
  if (buyer) {
    const message = `Your trade request for ${trade.product.name} has been ${status} by the seller.\n\nPlease login to your account for more details.`;
    
    try {
      await sendEmail({
        email: buyer.email,
        subject: `Trade ${status}`,
        message
      });
    } catch (error) {
      console.error('Error sending email:', error);
    }
  }

  res.status(200).json({
    success: true,
    trade
  });
});

// Rate trade => /api/v1/trade/rate/:id
exports.rateTrade = catchAsyncErrors(async (req, res, next) => {
  const { rating, feedback, ratee } = req.body;

  if (rating < 1 || rating > 5) {
    return next(new ErrorHandler('Rating must be between 1 and 5', 400));
  }

  let trade = await Trade.findById(req.params.id);

  if (!trade) {
    return next(new ErrorHandler('Trade not found', 404));
  }

  // Check if the trade is completed
  if (trade.status !== 'completed') {
    return next(new ErrorHandler('You can only rate completed trades', 400));
  }

  // Check if the logged in user is part of this trade
  if (trade.seller.toString() !== req.user.id.toString() && 
      trade.buyer.toString() !== req.user.id.toString()) {
    return next(new ErrorHandler('Not authorized to rate this trade', 401));
  }

  // Determine who is being rated
  if (ratee === 'seller' && trade.buyer.toString() === req.user.id.toString()) {
    trade.sellerRating = rating;
    trade.sellerFeedback = feedback;
  } else if (ratee === 'buyer' && trade.seller.toString() === req.user.id.toString()) {
    trade.buyerRating = rating;
    trade.buyerFeedback = feedback;
  } else {
    return next(new ErrorHandler('Invalid rating operation', 400));
  }

  await trade.save();

  // Update user's rating
  const userIdToUpdate = ratee === 'seller' ? trade.seller : trade.buyer;
  await updateUserRating(userIdToUpdate);

  res.status(200).json({
    success: true,
    message: 'Trade rated successfully'
  });
});

async function updateUserRating(userId) {
  const tradesAsSeller = await Trade.find({
    seller: userId,
    sellerRating: { $exists: true }
  });

  const tradesAsBuyer = await Trade.find({
    buyer: userId,
    buyerRating: { $exists: true }
  });

  const allRatings = [
    ...tradesAsSeller.map(t => t.sellerRating),
    ...tradesAsBuyer.map(t => t.buyerRating)
  ];

  if (allRatings.length > 0) {
    const totalRating = allRatings.reduce((sum, rating) => sum + rating, 0);
    const averageRating = totalRating / allRatings.length;

    await User.findByIdAndUpdate(userId, {
      rating: averageRating,
      numOfReviews: allRatings.length
    });
  }
}