import dotenv from "dotenv";

// load .env file
dotenv.config();

// helper to throw error if a required variable is missing
function requireEnv(key, defaultValue) {
    const value = process.env[key] || defaultValue;
    if (value === undefined) {
        throw new Error(`Missing required environment variable: ${ key }`);
    }
    return value;
}

// export config object
// Enforces some default value exists for every env variable,
// if not requireEnv() throws an error

export const config = {
    port: requireEnv("PORT", "5000"),
    databaseUrl: requireEnv("DATABASE_URL"),
    directUrl: requireEnv("DIRECT_URL"),
    jwtSecret: requireEnv("JWT_SECRET"),
    cloudinary: {
        cloudName: requireEnv("CLOUDINARY_CLOUD_NAME"),
        apiKey: requireEnv("CLOUDINARY_API_KEY"),
        apiSecret: requireEnv("CLOUDINARY_API_SECRET"),
    },
    nodeEnv: requireEnv("NODE_ENV", "development"),
    apiUrl: requireEnv("API_URL", "http://localhost:5000/api/health"),
    vapid: {
        publicKey: requireEnv("VAPID_PUBLIC_KEY"),
        privateKey: requireEnv("VAPID_PRIVATE_KEY"),
        subject: requireEnv("VAPID_SUBJECT", "mailto:info@contact.kumarprakhar.online"),
    },
    errorReportingWebhookUrl: requireEnv("ERROR_REPORTING_WEBHOOK_URL", ""),
    appVersion: requireEnv("APP_VERSION", "1.0.0"),
    gitCommit: requireEnv("RENDER_GIT_COMMIT", "local-build"),
};
