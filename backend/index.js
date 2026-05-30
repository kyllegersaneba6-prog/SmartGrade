const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

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

// One-time setup: create activity_log table if it doesn't exist
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  try {
    const { error } = await supabase.rpc('exec_sql', {
      query: `CREATE TABLE IF NOT EXISTS public.activity_log (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_name TEXT NOT NULL,
        action TEXT NOT NULL,
        details TEXT,
        department TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      );`
    });
    // If rpc doesn't exist, try direct insert to test the table
    if (error) {
      // Table may already exist — just test it
      await supabase.from('activity_log').select('id').limit(1);
    }
  } catch (e) {
    console.log('activity_log table setup: table may need to be created manually in Supabase dashboard.');
  }
})();

app.get('/', (req, res) => {
  res.send('SmartGrade Backend is running...');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
