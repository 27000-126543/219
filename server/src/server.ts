import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cron from 'node-cron';
import prisma from './config/prisma';
import { setSocketServer } from './services/notification.service';
import { sendClassReminders } from './controllers/live.controller';
import { generateMonthlyTeacherPerformance } from './controllers/statistics.controller';
import { checkAndCreateAlerts } from './controllers/alert.controller';

import authRoutes from './routes/auth.routes';
import courseRoutes from './routes/course.routes';
import classRoutes from './routes/class.routes';
import liveRoutes from './routes/live.routes';
import assignmentRoutes from './routes/assignment.routes';
import examRoutes from './routes/exam.routes';
import alertRoutes from './routes/alert.routes';
import scheduleRoutes from './routes/schedule.routes';
import statisticsRoutes from './routes/statistics.routes';

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  },
});

setSocketServer(io);

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/live', liveRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/schedule-changes', scheduleRoutes);
app.use('/api', statisticsRoutes);

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join', (userId: string) => {
    socket.join(`user:${userId}`);
    console.log(`User ${userId} joined room`);
  });

  socket.on('leave', (userId: string) => {
    socket.leave(`user:${userId}`);
    console.log(`User ${userId} left room`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

cron.schedule('*/5 * * * *', async () => {
  console.log('Checking for upcoming classes to send reminders...');
  const now = new Date();
  const thirtyMinutesLater = new Date(now.getTime() + 30 * 60 * 1000);

  const upcomingSessions = await prisma.liveSession.findMany({
    where: {
      startTime: {
        gte: now,
        lte: thirtyMinutesLater,
      },
      status: 'SCHEDULED',
      remindersSent: false,
    },
  });

  for (const session of upcomingSessions) {
    await sendClassReminders(session.id);
  }
});

cron.schedule('0 0 1 * *', async () => {
  console.log('Generating monthly teacher performance reports...');
  try {
    await generateMonthlyTeacherPerformance();
    console.log('Monthly performance reports generated successfully');
  } catch (error) {
    console.error('Error generating monthly performance reports:', error);
  }
});

cron.schedule('0 0 * * *', async () => {
  console.log('Checking for student alerts...');
  const classes = await prisma.class.findMany({
    where: { status: 'ACTIVE' },
    include: { enrollments: { where: { status: 'CONFIRMED' } } },
  });

  for (const class_ of classes) {
    for (const enrollment of class_.enrollments) {
      try {
        await checkAndCreateAlerts(class_.id, enrollment.studentId);
      } catch (error) {
        console.error(`Error checking alerts for student ${enrollment.studentId}:`, error);
      }
    }
  }
});

const PORT = process.env.PORT || 3001;

const startServer = async () => {
  try {
    await prisma.$connect();
    console.log('Database connected successfully');

    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
