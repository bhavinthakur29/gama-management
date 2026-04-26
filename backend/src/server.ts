process.env.TZ = 'Asia/Kolkata';

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { query } from '../db';
import { verifyBranch, verifySuperAdmin } from './middleware/auth';
import authRoutes from './routes/authRoutes';
import adminRoutes from './routes/adminRoutes';
import studentRoutes from './routes/studentRoutes';
import attendanceRoutes from './routes/attendanceRoutes';
import feeRoutes from './routes/feeRoutes';

const app = express();
const PORT = process.env.PORT || 5000;

function errorResponse(message: string) {
  return { error: true, message };
}

// This will tell us the truth in the terminal
console.log("------------------------------------");
console.log("DEBUG: DATABASE_URL is", process.env.DATABASE_URL ? "FOUND" : "NOT FOUND");
console.log("------------------------------------");

app.use(cors());
app.use(express.json());

// Public/Auth Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', verifySuperAdmin, adminRoutes);

// Protected Routes (Require Branch Middleware)
app.use('/api/students', verifyBranch, studentRoutes);
app.use('/api/attendance', verifyBranch, attendanceRoutes);
app.use('/api/fees', verifyBranch, feeRoutes);

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