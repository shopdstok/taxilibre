const axios = require('axios')

/**
 * Location Service - Google Maps API Integration
 */
class LocationService {
  constructor () {
    this.googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY
    this.baseURL = 'https://maps.googleapis.com/maps/api'
  }

  /**
   * Get address from coordinates (reverse geocoding)
   */
  async getAddressFromCoords (lat, lng) {
    try {
      const response = await axios.get(`${this.baseURL}/geocode/json`, {
        params: {
          latlng: `${lat},${lng}`,
          key: this.googleMapsApiKey
        }
      })

      if (response.data.status !== 'OK') {
        throw new Error(`Geocoding failed: ${response.data.status}`)
      }

      const result = response.data.results[0]
      return {
        address: result.formatted_address,
        components: result.address_components,
        placeId: result.place_id
      }
    } catch (error) {
      throw new Error(`Failed to get address from coordinates: ${error.message}`)
    }
  }

  /**
   * Get coordinates from address (geocoding)
   */
  async getCoordsFromAddress (address) {
    try {
      const response = await axios.get(`${this.baseURL}/geocode/json`, {
        params: {
          address,
          key: this.googleMapsApiKey
        }
      })

      if (response.data.status !== 'OK') {
        throw new Error(`Geocoding failed: ${response.data.status}`)
      }

      const result = response.data.results[0]
      const location = result.geometry.location

      return {
        lat: location.lat,
        lng: location.lng,
        formattedAddress: result.formatted_address,
        placeId: result.placeId
      }
    } catch (error) {
      throw new Error(`Failed to get coordinates from address: ${error.message}`)
    }
  }

  /**
   * Autocomplete addresses
   */
  async autocompleteAddress (input, location = null, radius = null) {
    try {
      const params = {
        input,
        key: this.googleMapsApiKey,
        types: 'geocode|establishment'
      }

      if (location && radius) {
        params.location = `${location.lat},${location.lng}`
        params.radius = radius
      }

      const response = await axios.get(`${this.baseURL}/place/autocomplete/json`, { params })

      if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
        throw new Error(`Autocomplete failed: ${response.data.status}`)
      }

      return response.data.predictions.map(prediction => ({
        description: prediction.description,
        placeId: prediction.place_id,
        terms: prediction.terms,
        structured_formatting: prediction.structured_formatting
      }))
    } catch (error) {
      throw new Error(`Failed to autocomplete address: ${error.message}`)
    }
  }

  /**
   * Get place details
   */
  async getPlaceDetails (placeId) {
    try {
      const response = await axios.get(`${this.baseURL}/place/details/json`, {
        params: {
          place_id: placeId,
          key: this.googleMapsApiKey,
          fields: 'geometry,formatted_address,address_components,name'
        }
      })

      if (response.data.status !== 'OK') {
        throw new Error(`Place details failed: ${response.data.status}`)
      }

      const result = response.data.result
      return {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
        formattedAddress: result.formatted_address,
        addressComponents: result.address_components,
        name: result.name
      }
    } catch (error) {
      throw new Error(`Failed to get place details: ${error.message}`)
    }
  }

  /**
   * Calculate distance between two points (Haversine formula)
   */
  calculateDistance (lat1, lng1, lat2, lng2) {
    const R = 6371 // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1)
    const dLng = this.toRadians(lng2 - lng1)

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distance = R * c

    return {
      km: distance,
      meters: distance * 1000,
      miles: distance * 0.621371
    }
  }

  /**
   * Get distance and duration using Google Maps Distance Matrix API
   */
  async getDistanceMatrix (origins, destinations, mode = 'driving') {
    try {
      const originStr = Array.isArray(origins)
        ? origins.map(o => `${o.lat},${o.lng}`).join('|')
        : `${origins.lat},${origins.lng}`

      const destStr = Array.isArray(destinations)
        ? destinations.map(d => `${d.lat},${d.lng}`).join('|')
        : `${destinations.lat},${destinations.lng}`

      const response = await axios.get(`${this.baseURL}/distancematrix/json`, {
        params: {
          origins: originStr,
          destinations: destStr,
          mode,
          key: this.googleMapsApiKey
        }
      })

      if (response.data.status !== 'OK') {
        throw new Error(`Distance matrix failed: ${response.data.status}`)
      }

      return response.data.rows.map(row => ({
        elements: row.elements.map(element => ({
          distance: element.distance ? {
            text: element.distance.text,
            value: element.distance.value // in meters
          } : null,
          duration: element.duration ? {
            text: element.duration.text,
            value: element.duration.value // in seconds
          } : null,
          status: element.status
        }))
      }))
    } catch (error) {
      throw new Error(`Failed to get distance matrix: ${error.message}`)
    }
  }

  /**
   * Get directions between two points
   */
  async getDirections (origin, destination, waypoints = [], mode = 'driving') {
    try {
      const originStr = `${origin.lat},${origin.lng}`
      const destStr = `${destination.lat},${destination.lng}`

      const waypointStr = waypoints.length > 0
        ? waypoints.map(wp => `${wp.lat},${wp.lng}`).join('|')
        : undefined

      const response = await axios.get(`${this.baseURL}/directions/json`, {
        params: {
          origin: originStr,
          destination: destStr,
          waypoints: waypointStr,
          mode,
          key: this.googleMapsApiKey
        }
      })

      if (response.data.status !== 'OK') {
        throw new Error(`Directions failed: ${response.data.status}`)
      }

      const route = response.data.routes[0]
      const leg = route.legs[0]

      return {
        distance: leg.distance,
        duration: leg.duration,
        startAddress: leg.start_address,
        endAddress: leg.end_address,
        polyline: route.overview_polyline.points,
        steps: leg.steps.map(step => ({
          distance: step.distance,
          duration: step.duration,
          instruction: step.html_instructions,
          startLocation: step.start_location,
          endLocation: step.end_location
        }))
      }
    } catch (error) {
      throw new Error(`Failed to get directions: ${error.message}`)
    }
  }

  /**
   * Calculate polyline (encoded string for map display)
   */
  calculatePolyline (points) {
    // This would use Google's polyline encoding algorithm
    // For now, return the points as-is
    return points
  }

  /**
   * Estimate ETA based on distance and average speed
   */
  estimateETA (distanceKm, averageSpeedKmh = 40) {
    const hours = distanceKm / averageSpeedKmh
    const minutes = Math.round(hours * 60)

    return {
      minutes,
      text: `${minutes} min`,
      hours: Math.floor(hours),
      remainingMinutes: minutes % 60
    }
  }

  /**
   * Search for nearby places
   */
  async searchNearby (location, type, radius = 1000) {
    try {
      const response = await axios.get(`${this.baseURL}/place/nearbysearch/json`, {
        params: {
          location: `${location.lat},${location.lng}`,
          radius,
          type,
          key: this.googleMapsApiKey
        }
      })

      if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
        throw new Error(`Nearby search failed: ${response.data.status}`)
      }

      return response.data.results.map(place => ({
        placeId: place.place_id,
        name: place.name,
        vicinity: place.vicinity,
        location: place.geometry.location,
        rating: place.rating,
        types: place.types
      }))
    } catch (error) {
      throw new Error(`Failed to search nearby places: ${error.message}`)
    }
  }

  /**
   * Helper: Convert degrees to radians
   */
  toRadians (degrees) {
    return degrees * (Math.PI / 180)
  }
}

module.exports = new LocationService()
