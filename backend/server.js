require('dotenv').config();
const app = require('./src/app');
const { startRentReminderJob } = require('./src/jobs/rentReminder.job');
const { startCollectionsAutomationJob } = require('./src/jobs/collectionsAutomation.job');

// server.js simply starts the Express application exported from src/app.js
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  if (process.env.ENABLE_LEGACY_RENT_REMINDER === 'true') {
    startRentReminderJob();
  }
  startCollectionsAutomationJob();
});
