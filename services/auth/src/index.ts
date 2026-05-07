import express from 'express';
import cors from 'cors';
import authorizeRouter from './routes/authorize';
import tokenRouter from './routes/token';
import userinfoRouter from './routes/userinfo';
import healthRouter from './routes/health';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

app.use(authorizeRouter);
app.use(tokenRouter);
app.use(userinfoRouter);
app.use(healthRouter);

app.listen(PORT, () => {
  console.log(`Auth microservice running on port ${PORT}`);
});