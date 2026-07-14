const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Generate a random string of specified length
 * @param {number} length - Length of the random string
 * @param {boolean} urlSafe - Whether to use URL-safe characters (default: true)
 * @returns {string} Random string
 */
function randomString(length, urlSafe = true) {
  const bytes = crypto.randomBytes(Math.ceil(length * 3 / 4)); // Get enough bytes
  let str = urlSafe
    ? bytes.toString('base64url') // URL-safe base64
    : bytes.toString('base64');   // Standard base64

  // Trim to exact length
  return str.substring(0, length);
}

/**
 * Generate a random password that includes special characters
 * @param {number} length - Length of the password
 * @returns {string} Random password
 */
function randomPassword(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+~`|}{[]\:;?><,./-=';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Define the secrets to generate and their corresponding placeholders in .env.production
const secretsToGenerate = [
  {
    placeholder: '[YOUR-SUPER-SECRET-PASSWORD]',
    generator: () => randomPassword(32),
    description: 'Database password for PostgreSQL'
  },
  {
    placeholder: '[YOUR-SUPER-SECRET-JWT-KEY-CHANGE-IN-PRODUCTION]',
    generator: () => randomString(64),
    description: 'JWT secret key for signing access tokens'
  },
  {
    placeholder: '[YOUR-SUPER-SECRET-REFRESH-KEY-CHANGE-IN-PRODUCTION]',
    generator: () => randomString(64),
    description: 'JWT secret key for signing refresh tokens'
  },
  {
    placeholder: '[YOUR-SESSION-SECRET-CHANGE-IN-PRODUCTION]',
    generator: () => randomString(64),
    description: 'Session secret for express-session'
  },
  {
    placeholder: '[YOUR-STRIPE-SECRET-KEY]',
    generator: () => `sk_live_${randomString(24)}`,
    description: 'Stripe secret key (get from dashboard.stripe.com)'
  },
  {
    placeholder: '[YOUR-STRIPE-PUBLIC-KEY]',
    generator: () => `pk_live_${randomString(24)}`,
    description: 'Stripe public key (get from dashboard.stripe.com)'
  },
  {
    placeholder: '[YOUR-STRIPE-WEBHOOK-SECRET]',
    generator: () => `whsec_${randomString(32)}`,
    description: 'Stripe webhook secret (get from dashboard.stripe.com)'
  },
  {
    placeholder: '[YOUR-GOOGLE-MAPS-API-KEY]',
    generator: () => `AIza${randomString(35)}`, // Google API keys start with AIza and are 39 chars total
    description: 'Google Maps API key (get from console.cloud.google.com)'
  },
  {
    placeholder: '[YOUR-EMAIL@gmail.com]',
    generator: () => {
      const randomLocalPart = randomString(12);
      return `${randomLocalPart}@gmail.com`; // Note: user may want to change domain
    },
    description: 'Email address for sending notifications (user may want to use custom domain)'
  },
  {
    placeholder: '[YOUR-APP-PASSWORD]',
    generator: () => randomPassword(16),
    description: 'App password for email SMTP (if using 2FA)'
  },
  {
    placeholder: '[YOUR-SENTRY-DSN]',
    generator: () => {
      // Sentry DSN format: https://<public_key>@<host>.ingest.sentry.io/<project_id>
      // We'll generate a fake one but user must replace with real
      return `https://${randomString(16)}@example.ingest.sentry.io/123456`;
    },
    description: 'Sentry DSN for error tracking (get from sentry.io)'
  }
];

// Read the .env.production file
const envFilePath = path.resolve('.env.production');
let envContent = fs.readFileSync(envFilePath, 'utf8');

// Track replacements and warnings
const replacements = [];
const warnings = [];

// Process each line
const lines = envContent.split('\n');
const updatedLines = lines.map(line => {
  // Skip empty lines and comments
  if (!line.trim() || line.startsWith('#')) {
    return line;
  }

  // Check if this line contains any of our placeholders
  let matched = false;
  for (const secret of secretsToGenerate) {
    if (line.includes(secret.placeholder)) {
      const newValue = secret.generator();
      const newLine = line.replace(secret.placeholder, newValue);
      replacements.push({
        placeholder: secret.placeholder,
        newValue,
        description: secret.description
      });
      matched = true;
      return newLine;
    }
  }

  if (!matched) {
    // Check if line contains any placeholder pattern [YOUR-*-*]
    const placeholderMatch = line.match(/\[YOUR-[^\]]+\]/);
    if (placeholderMatch) {
      warnings.push({
        line: line.trim(),
        placeholder: placeholderMatch[0]
      });
    }
  }

  return line;
});

// Write the updated content to a new file
const outputFilePath = path.resolve('.env.production.with_secrets');
fs.writeFileSync(outputFilePath, updatedLines.join('\n'));

// Output summary
replacements.forEach((rep, index) => {
  console.log     (`     ${rep.placeholder} → ${rep.newValue}`);
});

if (warnings.length > 0) {
  warnings.forEach((warn, index) => {
    console.log     (`     "${warn.line}"`);
  });
}


// Also output the full content for easy copy-paste
