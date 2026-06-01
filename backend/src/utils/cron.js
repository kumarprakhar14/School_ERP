import cron from 'cron';
import https from 'https';
import prisma from './db.js'; // Assuming db is here

const pingJob = new cron.CronJob("*/14 * * * *", function () {
    https
        .get(process.env.API_URL, (res) => {
            if (res.statusCode === 200) console.log("GET request sent successfully");
            else console.log("GET request failed", res.statusCode);
        })
        .on("error", (e) => console.error("Error while sending request", e));
});

// Run daily at midnight to auto-save locked attendances older than 48 hours
const attendanceAutoSaveJob = new cron.CronJob("0 0 * * *", async function () {
    try {
        const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
        const result = await prisma.attendance.updateMany({
            where: {
                isLocked: true,
                isSaved: false,
                lockedAt: { lt: fortyEightHoursAgo }
            },
            data: { isSaved: true }
        });
        if (result.count > 0) {
            console.log(`Auto-saved ${result.count} attendance records`);
        }
    } catch (e) {
        console.error("Error in attendanceAutoSaveJob", e);
    }
});

const cronJob = {
    start: () => {
        pingJob.start();
        attendanceAutoSaveJob.start();
    }
};

export default cronJob;