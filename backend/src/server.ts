// backend/server.ts
import express from 'express';
import { Pool } from 'pg'
import bcrypt from 'bcrypt';
import cors from 'cors';
import dotenv from 'dotenv';
import * as path from 'path';
import routes from './routes';

// Load environment variables from .env file
dotenv.config({ 
  path: path.resolve(__dirname, '../.env'),
  override: true 
});

const app = express();
// Simple request logger to help debug routing issues
app.use((req, _res, next) => {
  console.log(`[server] ${req.method} ${req.url}`);
  next();
});
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

const PORT = process.env.PORT || 5000;

// Debug middleware to log all registered routes
app.use((req, res, next) => {
  console.log(`[DEBUG] Incoming request: ${req.method} ${req.path}`);
  next();
});

// Import routes
import authRoutes from './routes/auth.routes';

// Configure routes
app.use('/api', (req, res, next) => {
  console.log(`[API Request] ${req.method} ${req.path}`);
  next();
});

// Mount auth routes
app.use('/api/auth', authRoutes);

// Mount other API routes
app.use('/api', routes);

// Handle 404s for API routes
app.use('/api', (req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Debug routes to help diagnose routing issues
app.get('/', (req, res) => {
  res.send('API is running...');
});

app.get('/debug', (req, res) => {
  const routes: any[] = [];
  app._router.stack.forEach((middleware: any) => {
    if (middleware.route) {
      // Routes registered directly on the app
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods)
      });
    } else if (middleware.name === 'router') {
      // Router middleware
      middleware.handle.stack.forEach((handler: any) => {
        if (handler.route) {
          routes.push({
            path: handler.route.path,
            methods: Object.keys(handler.route.methods),
            middleware: middleware.regexp.toString()
          });
        }
      });
    }
  });
  
  res.json({
    routes,
    port: process.env.PORT || 5000,
    authRoutesRegistered: Boolean(app._router.stack.find((m: any) => m.name === 'router' && m.regexp.test('/api/auth'))),
    environment: process.env.NODE_ENV || 'development'
  });
});


app.listen(PORT, () => {
  console.log(`Server running on port http://localhost:${PORT}`);
});