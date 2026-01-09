import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from server/.env
dotenv.config({ path: './server/.env' });

const app = express();
const PORT = process.env.PORT || 3001;

// MongoDB connection
let db;
const mongoClient = new MongoClient(process.env.MONGODB_URI, {
  retryWrites: true,
  w: 'majority',
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
  minPoolSize: 2,
  tls: true,
  tlsAllowInvalidCertificates: false,
  tlsAllowInvalidHostnames: false,
});

async function connectDB() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    console.log('⚠️  Note: Hotel/public WiFi may block MongoDB connections');
    
    await mongoClient.connect();
    db = mongoClient.db(process.env.MONGODB_DB_NAME);
    console.log('✅ Connected to MongoDB Atlas');
    
    // Test the connection
    await db.command({ ping: 1 });
    console.log('✅ MongoDB ping successful');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.log('\n💡 Troubleshooting (Hotel WiFi Issues):');
    console.log('   • Hotel/public WiFi often blocks MongoDB (port 27017)');
    console.log('   • Solution: Use mobile hotspot or VPN');
    console.log('   • Or: Set MongoDB IP whitelist to 0.0.0.0/0 in Atlas');
    console.log('   • Server will continue without database...\n');
    
    // Don't exit - allow server to run in degraded mode
    db = null;
  }
}

// Supabase client for JWT verification
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Authentication middleware
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Auth failed: Missing or invalid authorization header');
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);
    console.log('🔐 Verifying token for:', req.method, req.path);
    
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error) {
      console.error('❌ Token verification error:', error.message);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    if (!user) {
      console.error('❌ No user found for token');
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Attach user to request
    req.user = user;
    console.log('✅ Auth successful for user:', user.id);
    next();
  } catch (error) {
    console.error('❌ Authentication error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
}

// Health check endpoint (no auth required)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    mongodb: db ? 'connected' : 'disconnected'
  });
});

// Import route handlers
import closetRoutes from './routes/closet.js';
import outfitsRoutes from './routes/outfits.js';
import usersRoutes from './routes/users.js';
import communityRoutes from './routes/community.js';
import backgroundRemovalRoutes from './routes/backgroundRemoval.js';
import scraperRoutes from './routes/scraper.js';
import wishlistRoutes from './routes/wishlist.js';

// Database check middleware
function requireDB(req, res, next) {
  if (!db) {
    return res.status(503).json({ 
      error: 'Database unavailable',
      message: 'Server is running but cannot connect to MongoDB. Check your network connection (hotel WiFi may block MongoDB).'
    });
  }
  next();
}

// Start server
async function startServer() {
  try {
    await connectDB();
  } catch (error) {
    console.error('⚠️  Failed to connect to MongoDB, but server will continue:', error.message);
    db = null;
  }
  
  // Background removal route FIRST (needs raw body buffer, must come before other routes)
  app.use('/api/background-removal', express.raw({ type: 'image/*', limit: '10mb' }), backgroundRemovalRoutes);
  
  // Web scraper route (no auth required, no DB required)
  app.use('/api/scraper', scraperRoutes);
  
  // Only initialize DB routes if database is connected
  if (db) {
    // Apply routes with authentication and DB check
    app.use('/api/closet', authenticate, requireDB, closetRoutes(db));
    app.use('/api/outfits', authenticate, requireDB, outfitsRoutes(db));
    app.use('/api/users', authenticate, requireDB, usersRoutes(db));
    app.use('/api/community', authenticate, requireDB, communityRoutes(db));
    app.use('/api/wishlist', authenticate, requireDB, wishlistRoutes(db));
    console.log('✅ Database routes initialized');
  } else {
    // Stub routes that return 503 when DB is unavailable
    app.use('/api/closet', (req, res) => res.status(503).json({ error: 'Database unavailable - check network connection' }));
    app.use('/api/outfits', (req, res) => res.status(503).json({ error: 'Database unavailable - check network connection' }));
    app.use('/api/users', (req, res) => res.status(503).json({ error: 'Database unavailable - check network connection' }));
    app.use('/api/community', (req, res) => res.status(503).json({ error: 'Database unavailable - check network connection' }));
    app.use('/api/wishlist', (req, res) => res.status(503).json({ error: 'Database unavailable - check network connection' }));
    console.log('⚠️  Database routes disabled (MongoDB not connected)');
  }

  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });
  
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV}`);
    console.log(`🔒 CORS origin: ${process.env.CORS_ORIGIN}`);
  });
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await mongoClient.close();
  process.exit(0);
});

startServer();
