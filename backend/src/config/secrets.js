const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager({
  region: process.env.AWS_REGION || 'eu-west-1'
});

let cachedSecrets = null;

async function getSecrets() {
  if (cachedSecrets) return cachedSecrets;

  try {
    const response = await secretsManager.getSecretValue({
      SecretId: process.env.SECRET_NAME || ('taxilaire-' + (process.env.NODE_ENV || 'dev') + '-secrets')
    }).promise();

    cachedSecrets = JSON.parse(response.SecretString);
    return cachedSecrets;
  } catch (error) {
    console.error('Error fetching secrets:', error);
    // Fallback to env vars for local development
    return {
      DB_HOST: process.env.DB_HOST,
      DB_NAME: process.env.DB_NAME,
      DB_USER: process.env.DB_USER,
      DB_PASSWORD: process.env.DB_PASSWORD,
      REDIS_HOST: process.env.REDIS_HOST,
      REDIS_PORT: process.env.REDIS_PORT,
      REDIS_PASSWORD: process.env.REDIS_PASSWORD,
      JWT_SECRET: process.env.JWT_SECRET,
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
      TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
      FIREBASE_SERVICE_ACCOUNT: process.env.FIREBASE_SERVICE_ACCOUNT
    };
  }
}

module.exports = { getSecrets };
