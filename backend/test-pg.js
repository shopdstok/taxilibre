const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env'), override: false });

const config = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
};

const client = new Client(config);

client.connect()
  .then(() => {
    console.log('Connected to PostgreSQL successfully!');
    return client.end();
  })
  .then(() => {
    process.exit(0);
  })
  .catch(err => {
    console.error('Connection error:', err.stack);
    process.exit(1);
  });
