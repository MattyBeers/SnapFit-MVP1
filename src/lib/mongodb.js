/**
 * MongoDB Connection Singleton
 * Provides a single, reusable connection to MongoDB Atlas
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// MongoDB connection URI from environment variables
// In Vite app, use import.meta.env; in Node.js scripts, use process.env
const MONGODB_URI = process.env.VITE_MONGODB_URI || import.meta.env?.VITE_MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.VITE_MONGODB_DB_NAME || import.meta.env?.VITE_MONGODB_DB_NAME || 'snapfit';

let cachedClient = null;
let cachedDb = null;

/**
 * Connect to MongoDB Atlas
 * Returns a singleton database connection
 */
export async function connectToDatabase() {
  // Return cached connection if available
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  try {
    // Create new MongoDB client
    const client = new MongoClient(MONGODB_URI, {
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
    });

    // Connect to cluster
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas');

    // Get database instance
    const db = client.db(DB_NAME);

    // Cache for reuse
    cachedClient = client;
    cachedDb = db;

    return { client, db };
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw new Error('Failed to connect to MongoDB');
  }
}

/**
 * Get MongoDB database instance
 * Use this in your API calls
 */
export async function getDatabase() {
  const { db } = await connectToDatabase();
  return db;
}

/**
 * Close MongoDB connection
 * Call this on app shutdown (optional in browser context)
 */
export async function closeDatabaseConnection() {
  if (cachedClient) {
    await cachedClient.close();
    cachedClient = null;
    cachedDb = null;
    console.log('🔌 MongoDB connection closed');
  }
}
