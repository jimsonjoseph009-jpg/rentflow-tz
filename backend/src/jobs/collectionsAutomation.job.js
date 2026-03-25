const cron = require('node-cron');
const { runCollectionsAutomation } = require('../services/collectionsAutomation.service');

const startCollectionsAutomationJob = () => {
  const schedule = process.env.COLLECTIONS_AUTOMATION_CRON || '30 8 * * *';

  cron.schedule(schedule, async () => {
    try {
      const result = await runCollectionsAutomation({ dryRun: false });
      console.log(
        `[collections-job] done reminders=${result.reminders.sent}/${result.reminders.processed} retries=${result.retries.notified}/${result.retries.matched_rules}`
      );
    } catch (error) {
      console.error('[collections-job] failed', error.message);
    }
  });
};

module.exports = {
  startCollectionsAutomationJob,
};
