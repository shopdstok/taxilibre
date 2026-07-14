const jwtService = require('./src/services/jwtService');

// Set the environment variables (should already be set, but just in case)
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key';

// We don't need the database for this test
// Create a mock user object (we don't need to save it)
const user = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com',
  role: 'passenger'
};

console.log('JWT_SECRET from process.env:', process.env.JWT_SECRET);
console.log('JWT_SECRET in jwtService:', jwtService.JWT_SECRET);

// Generate token pair
jwtService.generateTokenPair(user).then(tokens => {
  console.log('Generated tokens:', tokens);

  // Verify the access token
  return jwtService.verifyAccessToken(tokens.accessToken);
}).then(decoded => {
  console.log('Decoded token:', decoded);
  console.log('Token is valid');
}).catch(error => {
  console.error('Error:', error.message);
});
