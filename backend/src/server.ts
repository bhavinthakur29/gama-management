process.env.TZ = 'Asia/Kolkata';

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { query } from '../db.js';
import { verifyBranch, verifySuperAdmin } from './middleware/auth.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import feeRoutes from './routes/feeRoutes.js';
import beltRoutes from './routes/beltRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;

function errorResponse(message: string) {
  return { error: true, message };
}

// This will tell us the truth in the terminal
console.log("------------------------------------");
console.log("DEBUG: DATABASE_URL is", process.env.DATABASE_URL ? "FOUND" : "NOT FOUND");
console.log("------------------------------------");

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-instructor-profile-id',
    'x-instructor-session-expires-at',
    'x-staff-profile-id',
    'x-staff-session-expires-at',
  ]
}));
app.use(express.json());

// Public/Auth Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', verifySuperAdmin, adminRoutes);

// Protected Routes (Require Branch Middleware)
app.use('/api/students', verifyBranch, studentRoutes);
app.use('/api/attendance', verifyBranch, attendanceRoutes);
app.use('/api/fees', verifyBranch, feeRoutes);
app.use('/api/belt-ranks', verifyBranch, beltRoutes);

app.get('/health', async (req, res) => {
  try {
    const dbResult = await query(
      "SELECT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') AS now",
    );
    res.json({ 
      status: 'GAMA Backend is Online',
      database: 'Connected',
      db_time: dbResult.rows[0].now 
    });
  }  catch (error) {
    // This line is key! It will print the real reason in your Cursor terminal
    console.error("❌ FULL DATABASE ERROR:", error); 
    
    res.status(500).json({ 
      ...errorResponse(error instanceof Error ? error.message : 'Unknown error'),
      status: 'Database Error'
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 GAMA Server listening at http://localhost:${PORT}`);
});