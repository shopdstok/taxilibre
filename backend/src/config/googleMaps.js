require('dotenv').config({ override: false });

const { logger } = require('../services/loggingService');
const { Client } = require('@googlemaps/google-maps-services-js');

const apiKey = process.env.GOOGLE_MAPS_API_KEY;
if (!apiKey || apiKey === 'your-google-maps-api-key-here') {
  logger.warn('GOOGLE_MAPS_API_KEY not set or using placeholder. Google Maps features will not work.');
}

const client = new Client({});

const distanceMatrix = async (params) => {
  if (!apiKey || apiKey === 'your-google-maps-api-key-here') {
    throw new Error('Google Maps API key not configured');
  }
  try {
    const response = await client.distancematrix({
      params: { ...params, key: apiKey },
      timeout: 10000
    });
    return response.data;
  } catch (error) {
    logger.error('Google Maps Distance Matrix API error:', error.message);
    throw error;
  }
};

const geocode = async (params) => {
  if (!apiKey || apiKey === 'your-google-maps-api-key-here') {
    throw new Error('Google Maps API key not configured');
  }
  try {
    const response = await client.geocode({
      params: { ...params, key: apiKey },
      timeout: 10000
    });
    return response.data;
  } catch (error) {
    logger.error('Google Maps Geocoding API error:', error.message);
    throw error;
  }
};

module.exports = {
  distanceMatrix,
  geocode,
  client
};
