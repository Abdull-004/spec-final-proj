// config/db.js
const mongoose = require('mongoose');
const { log, error } = console;

const connectDatabase = async () => {
  try {
    // Connection configuration
    const conn = await mongoose.connect(process.env.DB_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      maxPoolSize: 10, // Maintain up to 10 socket connections
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      family: 4, // Use IPv4, skip IPv6
    });

    log(`\x1b[32m✓ MongoDB connected to: ${conn.connection.host}\x1b[0m`);
    log(`- Database name: ${conn.connection.name}`);
    log(`- Port: ${conn.connection.port}`);
    log(`- Models: ${Object.keys(mongoose.models).join(', ')}`);

    // Connection event handlers
    mongoose.connection.on('connected', () => {
      log('\x1b[32m✓ MongoDB connection established\x1b[0m');
    });

    mongoose.connection.on('error', (err) => {
      error('\x1b[31m✗ MongoDB connection error:', err, '\x1b[0m');
    });

    mongoose.connection.on('disconnected', () => {
      log('\x1b[33mℹ MongoDB disconnected\x1b[0m');
    });

    // Close connection on process termination
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      log('\x1b[33mℹ MongoDB connection closed through app termination\x1b[0m');
      process.exit(0);
    });

  } catch (err) {
    error('\x1b[31m✗ MongoDB connection failed:', err.message, '\x1b[0m');
    error('- Error details:', err);
    
    // Exit with failure code if DB connection is critical
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

module.exports = connectDatabase;