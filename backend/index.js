const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const authRoutes = require('./routes/auth');
const { createCorsOptions } = require('./middleware/cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Login rate limiting keys off req.ip. Only trust X-Forwarded-For when the
// deployment actually sits behind a reverse proxy / load balancer, otherwise a
// client could spoof the header and bypass the per-IP window.
if (process.env.TRUST_PROXY) {
  const trustProxy = process.env.TRUST_PROXY;
  app.set('trust proxy', trustProxy === 'true' ? true : Number(trustProxy) || trustProxy);
}

app.use(cors(createCorsOptions(PORT)));
app.use(express.json({ limit: '55mb' }));

const { rejectArchivedWrites } = require('./middleware/termLock');
app.use(rejectArchivedWrites);

const usersRoutes = require('./routes/users');
const activityRoutes = require('./routes/activity');
const sectionsRoutes = require('./routes/sections');
const subjectsRoutes = require('./routes/subjects');
const assignmentsRoutes = require('./routes/assignments');
const departmentsRoutes = require('./routes/departments');
const coursesRoutes = require('./routes/courses');
const termsRoutes = require('./routes/terms');
const gradingComponentsRoutes = require('./routes/gradingComponents');
const componentActivitiesRoutes = require('./routes/componentActivities');
const componentScoresRoutes = require('./routes/componentScores');
const attendanceRoutes = require('./routes/attendance');
const aiRoutes = require('./routes/ai');
const backupRoutes = require('./routes/backup');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/sections', sectionsRoutes);
app.use('/api/subjects', subjectsRoutes);
app.use('/api/assignments', assignmentsRoutes);
app.use('/api/departments', departmentsRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/terms', termsRoutes);
app.use('/api/grading-components', gradingComponentsRoutes);
app.use('/api/component-activities', componentActivitiesRoutes);
app.use('/api/component-scores', componentScoresRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/backup', backupRoutes);

app.get('/', (req, res) => {
  res.send('SmartGrade Backend is running...');
});

// 404 — unknown routes return JSON instead of Express HTML.
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Central error handler — malformed JSON, oversized bodies, and any error
// passed to next(). Never exposes stack traces or database text.
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Invalid JSON body.' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Request body too large.' });
  }

  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({ message: 'Server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
