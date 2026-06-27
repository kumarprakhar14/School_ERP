import { config } from '../config/env.js';
import prisma from '../utils/db.js';
import crypto from 'crypto';
import os from 'os';

const SENSITIVE_KEYS = [
  'password', 'confirmpassword', 'accesstoken', 'refreshtoken',
  'authorization', 'cookie', 'otp', 'secret', 'apikey',
  'creditcard', 'upi', 'session'
];

/**
 * Recursively sanitize sensitive fields in an object
 */
const sanitizeData = (data) => {
  if (!data) return data;
  if (typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    if (SENSITIVE_KEYS.some(k => normalizedKey.includes(k))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeData(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

/**
 * Generate a deterministic fingerprint for an error
 */
const generateFingerprint = (errorName, errorMessage, stackTrace) => {
  // Try to extract the first meaningful stack frame
  const stackLines = stackTrace ? stackTrace.split('\n') : [];
  const firstFrame = stackLines.find(line => line.includes('at ') && !line.includes('node:internal')) || '';
  
  const rawFingerprint = `${errorName}|${errorMessage}|${firstFrame}`;
  return crypto.createHash('sha256').update(rawFingerprint).digest('hex');
};

/**
 * Main function to handle production error reporting asynchronously
 */
export const reportError = async (err, contextStore) => {
  try {
    if (config.nodeEnv !== 'production') return;

    // Build Request Context
    const req = contextStore?.get('req');
    const requestId = contextStore?.get('requestId');
    
    const requestBody = req?.body ? sanitizeData(req.body) : null;
    const queryParams = req?.query ? sanitizeData(req.query) : null;
    const routeParams = req?.params ? sanitizeData(req.params) : null;
    const clientIp = contextStore?.get('ip') || req?.ip;
    const userAgent = contextStore?.get('userAgent') || req?.get('User-Agent');
    const httpMethod = req?.method;
    const apiRoute = req?.originalUrl;

    const schoolId = contextStore?.get('schoolId');
    const schoolName = contextStore?.get('schoolName');
    const userId = contextStore?.get('userId');
    const userRole = contextStore?.get('userRole');

    // Error details
    const errorName = err.name || 'Error';
    const errorMessage = err.message || 'Unknown error';
    const stackTrace = err.stack || '';
    
    const stackLines = stackTrace.split('\n');
    const rootStackFrame = stackLines.find(line => line.includes('at ') && !line.includes('node:internal')) || null;

    const fingerprint = generateFingerprint(errorName, errorMessage, stackTrace);

    const environment = config.nodeEnv;
    const appVersion = config.appVersion || null;
    const gitCommit = config.gitCommit || null;
    const hostname = os.hostname();
    const serverUptime = process.uptime();

    // 1. Database Persistence & Deduplication
    let dbRecord;
    let isFirstOccurrence = false;
    
    // Find unresolved error with same fingerprint
    dbRecord = await prisma.productionError.findFirst({
      where: {
        fingerprint,
        resolutionStatus: 'UNRESOLVED'
      }
    });

    if (dbRecord) {
      dbRecord = await prisma.productionError.update({
        where: { id: dbRecord.id },
        data: {
          occurrenceCount: { increment: 1 },
          lastSeenAt: new Date(),
          requestBody,
          queryParams,
          routeParams,
          userId,
          userRole,
          schoolId,
          schoolName
        }
      });
    } else {
      isFirstOccurrence = true;
      dbRecord = await prisma.productionError.create({
        data: {
          fingerprint,
          errorName,
          errorMessage,
          stackTrace,
          rootStackFrame,
          httpStatusCode: 500,
          httpMethod,
          apiRoute,
          requestId,
          schoolId,
          schoolName,
          userId,
          userRole,
          requestBody,
          queryParams,
          routeParams,
          clientIp,
          userAgent,
          environment,
          appVersion,
          gitCommit,
          hostname,
          serverUptime,
          reportingStatus: 'PENDING',
          occurrenceCount: 1
        }
      });
    }

    // 2. Transmit to n8n Webhook
    if (config.errorReportingWebhookUrl) {
      console.log(`[Error Reporter] Sending error ${fingerprint} to webhook...`);
      
      const payload = {
        environment,
        timestamp: new Date().toISOString(),
        requestId,
        httpMethod,
        route: apiRoute,
        statusCode: 500,
        school: { id: schoolId, name: schoolName },
        user: { id: userId, role: userRole },
        requestMetadata: {
          query: queryParams,
          params: routeParams,
          body: requestBody,
          ip: clientIp,
          userAgent
        },
        serverMetadata: {
          appVersion,
          gitCommit,
          hostname,
          uptime: serverUptime,
          nodeVersion: process.version,
          processId: process.pid
        },
        error: {
          name: errorName,
          message: errorMessage,
          stackTrace
        },
        fingerprint,
        occurrenceCount: dbRecord.occurrenceCount,
        errorId: dbRecord.id,
        isFirstOccurrence,
        reportingStatus: 'PENDING'
      };

      // Ensure undefined fields are removed if they are empty
      if (!payload.serverMetadata.appVersion) delete payload.serverMetadata.appVersion;
      if (!payload.serverMetadata.gitCommit) delete payload.serverMetadata.gitCommit;

      try {
        const response = await fetch(config.errorReportingWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          await prisma.productionError.update({
            where: { id: dbRecord.id },
            data: { reportingStatus: 'SENT' }
          });
          console.log(`[Error Reporter] Successfully sent error to webhook.`);
        } else {
          throw new Error(`Webhook returned status ${response.status}`);
        }
      } catch (webhookErr) {
        await prisma.productionError.update({
          where: { id: dbRecord.id },
          data: { reportingStatus: 'FAILED' }
        });
        console.error(`[Error Reporter] Failed to send webhook:`, webhookErr.message);
      }
    }

  } catch (reporterError) {
    // Fail silently so we don't break the response lifecycle
    console.error(`[Error Reporter] Internal failure during error reporting:`, reporterError);
  }
};
