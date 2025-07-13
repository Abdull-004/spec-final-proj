const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.ObjectId,
    ref: 'Product',
    required: true
  },
  seller: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  buyer: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  quantity: {
    type: Number,
    required: [true, 'Please enter quantity']
  },
  price: {
    type: Number,
    required: [true, 'Please enter price']
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'completed', 'rejected'],
    default: 'pending'
  },
  completedAt: {
    type: Date
  },
  sellerRating: {
    type: Number,
    min: 1,
    max: 5
  },
  buyerRating: {
    type: Number,
    min: 1,
    max: 5
  },
  sellerFeedback: {
    type: String
  },
  buyerFeedback: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Trade', tradeSchema);