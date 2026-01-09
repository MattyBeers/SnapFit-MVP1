import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config({ path: './server/.env' });

console.log('🧪 Testing MongoDB Connection...\n');
console.log('MongoDB URI:', process.env.MONGODB_URI.replace(/:[^:@]+@/, ':****@'));
console.log('Database Name:', process.env.MONGODB_DB_NAME);
console.log('\n');

// Test different connection options
const connectionConfigs = [
  {
    name: 'Default with TLS',
    options: {
      tls: true,
      serverSelectionTimeoutMS: 10000,
    }
  },
  {
    name: 'Relaxed TLS',
    options: {
      tls: true,
      tlsAllowInvalidCertificates: true,
      tlsAllowInvalidHostnames: true,
      serverSelectionTimeoutMS: 10000,
    }
  },
  {
    name: 'With directConnection',
    options: {
      tls: true,
      directConnection: false,
      serverSelectionTimeoutMS: 10000,
    }
  }
];

async function testConnection(config) {
  console.log(`\n📡 Testing: ${config.name}`);
  console.log('Options:', JSON.stringify(config.options, null, 2));
  
  const client = new MongoClient(process.env.MONGODB_URI, config.options);
  
  try {
    await client.connect();
    console.log('✅ Connection successful!');
    
    const db = client.db(process.env.MONGODB_DB_NAME);
    const pingResult = await db.command({ ping: 1 });
    console.log('✅ Ping successful:', pingResult);
    
    const collections = await db.listCollections().toArray();
    console.log('✅ Collections found:', collections.map(c => c.name).join(', '));
    
    return true;
  } catch (error) {
    console.log('❌ Connection failed:', error.message);
    if (error.code) console.log('Error code:', error.code);
    return false;
  } finally {
    await client.close();
  }
}

async function runTests() {
  console.log('🏁 Starting connection tests...\n');
  
  for (const config of connectionConfigs) {
    const success = await testConnection(config);
    if (success) {
      console.log('\n✅ Found working configuration!');
      console.log('Use these options in server/index.js:');
      console.log(JSON.stringify(config.options, null, 2));
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n🏁 Tests complete');
  process.exit(0);
}

runTests().catch(error => {
  console.error('\n❌ Test suite failed:', error);
  process.exit(1);
});
