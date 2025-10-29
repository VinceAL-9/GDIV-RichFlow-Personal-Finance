// backend/server.ts
import express from 'express';
import { Pool } from 'pg'
import bcrypt from 'bcrypt';
import cors from 'cors';
import * as dotenv from 'dotenv'

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

app.get('/', (req, res) => {
  res.send('API is running...');
});


app.listen(PORT, () => {
  console.log(`Server running on port `);
});