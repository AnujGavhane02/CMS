import mongoose from 'mongoose';
import { logger } from './logger.js';

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cms_db';
    
    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    logger.info(`MongoDB Connected: ${conn.connection.host}`);

    // SAFETY CHECK: Remove any dangerous TTL index on refreshTokens.createdAt
    // MongoDB TTL indexes on subdocument array fields (like refreshTokens.createdAt)
    // delete the ENTIRE parent document when the indexed date expires — not just the
    // array entry. This was previously causing all user accounts to be silently deleted
    // after 7 days of inactivity. This guard ensures the index can never persist.
    try {
      const usersCollection = conn.connection.db.collection('users');
      const indexes = await usersCollection.indexes();
      const dangerousTTL = indexes.find(
        idx => idx.key && idx.key['refreshTokens.createdAt'] && idx.expireAfterSeconds !== undefined
      );
      if (dangerousTTL) {
        await usersCollection.dropIndex(dangerousTTL.name);
        logger.warn(`⚠️  Dropped dangerous TTL index "${dangerousTTL.name}" on users collection — this index was deleting entire user documents!`);
      }
    } catch (indexErr) {
      // Log but don't crash if index check fails (e.g., permissions)
      logger.warn('Could not check/drop TTL indexes on users collection:', indexErr.message);
    }

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    logger.error('Database connection failed:', error);
    process.exit(1);
  }
};

export default connectDB;
