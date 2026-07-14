const { z } = require('zod')

const createRideSchema = z.object({
  pickup: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
  }),
  destination: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
  }).optional()
})

const acceptRideSchema = z.object({
  rideId: z.string().uuid(),
  driverId: z.string().uuid()
})

module.exports = {
  createRideSchema,
  acceptRideSchema
}
