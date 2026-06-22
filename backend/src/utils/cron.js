import cron from 'cron';
import https from 'https';
import { config } from '../config/env.js';
import prisma from './db.js'; // Assuming db is here

const pingJob = new cron.CronJob("*/14 * * * *", function () {
    https
        .get(config.apiUrl, (res) => {
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

// Run daily at 1:00 AM to expire outdated subscriptions
const subscriptionExpiryJob = new cron.CronJob("0 1 * * *", async function () {
    try {
        const now = new Date();

        // Find subscriptions that need expiring (to get schoolIds for validity sync)
        const expiring = await prisma.schoolSubscription.findMany({
            where: {
                status: 'ACTIVE',
                expiresAt: { lt: now }
            },
            select: { id: true, schoolId: true, expiresAt: true }
        });

        if (expiring.length > 0) {
            // Batch expire all
            await prisma.schoolSubscription.updateMany({
                where: { id: { in: expiring.map(s => s.id) } },
                data: { status: 'EXPIRED' }
            });

            // Bridge: sync School.validUntil for affected schools
            // Only update if they don't have another active subscription
            for (const sub of expiring) {
                const otherActive = await prisma.schoolSubscription.findFirst({
                    where: {
                        schoolId: sub.schoolId,
                        status: 'ACTIVE',
                        startsAt: { lte: now },
                        OR: [
                            { expiresAt: null },
                            { expiresAt: { gt: now } }
                        ]
                    }
                });
                if (!otherActive) {
                    await prisma.school.update({
                        where: { id: sub.schoolId },
                        data: { validUntil: sub.expiresAt }
                    });
                }
            }

            console.log(`Expired ${expiring.length} subscriptions`);
        }
    } catch (e) {
        console.error("Error in subscriptionExpiryJob", e);
    }
});

const cronJob = {
    start: () => {
        pingJob.start();
        attendanceAutoSaveJob.start();
        subscriptionExpiryJob.start();
    }
};

export default cronJob;