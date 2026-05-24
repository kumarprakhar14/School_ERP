require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'School ERP API is running' });
});

// Import and use routes here
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/schools', require('./routes/school.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/classes', require('./routes/class.routes'));
app.use('/api/attendance', require('./routes/attendance.routes'));
app.use('/api/notices', require('./routes/notice.routes'));
app.use('/api/assignments', require('./routes/assignment.routes'));
app.use('/api/fees', require('./routes/fee.routes'));
app.use('/api/dashboard', require('./routes/dashboard.routes'));

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({ message: 'API Endpoint Not Found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { error: err.stack }),
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
