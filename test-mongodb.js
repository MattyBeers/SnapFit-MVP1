/**
 * MongoDB Connection Test
 * Run this to verify your Atlas connection works
 */

import { connectToDatabase, getDatabase, closeDatabaseConnection } from './src/lib/mongodb.js';

async function testConnection() {
  console.log('🔌 Testing MongoDB Atlas connection...\n');

  try {
    // Test connection
    await connectToDatabase();
    console.log('✅ Connected to MongoDB Atlas successfully!\n');

    // Get database instance
    const db = await getDatabase();
    console.log(`📦 Database: ${db.databaseName}\n`);

    // List existing collections
    const collections = await db.listCollections().toArray();
    console.log(`📋 Collections (${collections.length}):`);
    if (collections.length === 0) {
      console.log('   No collections yet (this is normal for a new database)\n');
    } else {
      collections.forEach(col => console.log(`   - ${col.name}`));
      console.log('');
    }

    // Test write operation
    console.log('💾 Testing write operation...');
    const testCollection = db.collection('_connection_test');
    const result = await testCollection.insertOne({
      test: true,
      message: 'SnapFit MongoDB connection verified',
      timestamp: new Date(),
    });
    console.log(`✅ Test document inserted with ID: ${result.insertedId}\n`);

    // Test read operation
    console.log('📖 Testing read operation...');
    const doc = await testCollection.findOne({ _id: result.insertedId });
    console.log(`✅ Test document retrieved:`, doc, '\n');

    // Cleanup test collection
    console.log('🧹 Cleaning up test collection...');
    await testCollection.drop();
    console.log('✅ Test collection removed\n');

    console.log('🎉 All tests passed! Your MongoDB Atlas connection is ready to use.\n');

    // Close connection
    await closeDatabaseConnection();
    console.log('👋 Connection closed.');

  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

testConnection();
