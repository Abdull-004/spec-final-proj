const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');

// Load env vars
dotenv.config({ path: './config/config.env' });

// Route files
const auth = require('./routes/auth');
const users = require('./routes/user');
const products = require('./routes/product');
const consultations = require('./routes/consultation');
const trades = require('./routes/trade');

// DB Connection
const connectDatabase = require('./config/db');
connectDatabase();

const app = express();

// Body parser
app.use(express.json());
app.use(cookieParser());

// Enable CORS
app.use(cors());

// Mount routers
app.use('/api/v1', auth);
app.use('/api/v1', users);
app.use('/api/v1', products);
app.use('/api/v1', consultations);
app.use('/api/v1', trades);

// Error handling middleware
const errorMiddleware = require('./middlewares/errors');
app.use(errorMiddleware);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(
    `Server running in ${process.env.NODE_ENV} mode on port ${PORT}`
  );
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});