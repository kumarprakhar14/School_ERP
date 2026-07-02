import { config } from './config/env.js';
import cronJob from './utils/cron.js';
import { initializeWebPush } from './services/notificationService.js';
import app from './app.js';

if (config.nodeEnv==="production") {
    cronJob.start();
}

// Initialize web-push VAPID credentials
initializeWebPush();

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
