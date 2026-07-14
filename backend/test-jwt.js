const jwtService = require('./src/services/jwtService');
const { User } = require('./src/models');

// Set the environment variables (should already be set, but just in case)
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key';

// We need to initialize the database connection for the User model to work
const { sequelize } = require('./src/config/database');

// Initialize the database (we don't need to sync for this test, but we need the model to be defined)
sequelize.authenticate().then(async () => {
  console.log('Database connected');

  // Create a mock user object (we don't need to save it)
  const user = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    role: 'passenger'
  };

  // Generate token pair
  const tokens = await jwtService.generateTokenPair(user);
  console.log('Generated tokens:', tokens);

  // Verify the access token
  try {
    const decoded = await jwtService.verifyAccessToken(tokens.accessToken);
    console.log('Decoded token:', decoded);
    console.log('Token is valid');
  } catch (error) {
    console.error('Error verifying token:', error.message);
  }
}).catch(err => {
  console.error('Database connection error:', err);
});
