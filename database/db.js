const mongoose = require('mongoose');

const mongoURI = 'mongodb://127.0.0.1:27017/Contracks';

const connectDB = async () => {
  try {
    await mongoose.connect(mongoURI);
    console.log('✅MongoDB connected successfully!');
  } catch (err) {
    console.error(`MongoDB connection error: ${err.message}`);
    process.exit(1); 
  }
};

connectDB()

module.exports = connectDB;
