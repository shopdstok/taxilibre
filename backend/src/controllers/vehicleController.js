const { Vehicle, Driver, VehicleType } = require('../models')
const { sendSuccess, sendError } = require('../utils/response')
const AppError = require('../middleware/errorMiddleware').AppError

/**
 * Create a new vehicle for driver
 */
const createVehicle = async (req, res, next) => {
  try {
    const {
      type,
      brand,
      model,
      year,
      color,
      licensePlate,
      seats,
      isAccessible = false,
      registrationDocUrl,
      insuranceDocUrl
    } = req.body
    const driverId = req.driverId

    // Validate vehicle type
    if (!Object.values(VehicleType).includes(type)) {
      throw new AppError('Invalid vehicle type', 400, 'INVALID_VEHICLE_TYPE')
    }

    // Check if driver exists and is a driver
    const driver = await Driver.findByPk(driverId)
    if (!driver) {
      throw new AppError('Driver not found', 404, 'DRIVER_NOT_FOUND')
    }

    // Check if license plate already exists
    const existingVehicle = await Vehicle.findOne({ where: { licensePlate } })
    if (existingVehicle) {
      throw new AppError('License plate already exists', 409, 'LICENSE_PLATE_EXISTS')
    }

    // Create vehicle
    const vehicle = await Vehicle.create({
      driverId,
      type,
      brand,
      model,
      year,
      color,
      licensePlate,
      seats,
      isAccessible,
      registrationDocUrl,
      insuranceDocUrl
    })

    sendSuccess(res, vehicle.toJSON(), 'Vehicle created successfully', 201)
  } catch (error) {
    next(error)
  }
}

/**
 * Get driver's vehicles
 */
const getVehicles = async (req, res, next) => {
  try {
    const driverId = req.driverId

    // Check if driver exists
    const driver = await Driver.findByPk(driverId)
    if (!driver) {
      throw new AppError('Driver not found', 404, 'DRIVER_NOT_FOUND')
    }

    const vehicles = await Vehicle.findAll({
      where: { driverId },
      order: [['createdAt', 'DESC']]
    })

    sendSuccess(res, {
      vehicles: vehicles.map(v => v.toJSON())
    }, 'Vehicles retrieved successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Get vehicle details
 */
const getVehicle = async (req, res, next) => {
  try {
    const vehicleId = req.params.id
    const driverId = req.driverId

    const vehicle = await Vehicle.findByPk(vehicleId, {
      include: [
        { model: Driver, as: 'driver' }
      ]
    })

    if (!vehicle) {
      throw new AppError('Vehicle not found', 404, 'VEHICLE_NOT_FOUND')
    }

    // Check if vehicle belongs to driver
    if (vehicle.driverId !== driverId) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED')
    }

    sendSuccess(res, {
      ...vehicle.toJSON(),
      driver: vehicle.driver ? {
        id: vehicle.driver.id,
        licenseNumber: vehicle.driver.licenseNumber
      } : null
    }, 'Vehicle details retrieved successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Update vehicle
 */
const updateVehicle = async (req, res, next) => {
  try {
    const vehicleId = req.params.id
    const driverId = req.driverId
    const updates = req.body

    const vehicle = await Vehicle.findByPk(vehicleId)
    if (!vehicle) {
      throw new AppError('Vehicle not found', 404, 'VEHICLE_NOT_FOUND')
    }

    // Check if vehicle belongs to driver
    if (vehicle.driverId !== driverId) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED')
    }

    // Validate vehicle type if being updated
    if (updates.type && !Object.values(VehicleType).includes(updates.type)) {
      throw new AppError('Invalid vehicle type', 400, 'INVALID_VEHICLE_TYPE')
    }

    // Check if license plate is being updated and already exists
    if (updates.licensePlate && updates.licensePlate !== vehicle.licensePlate) {
      const existingVehicle = await Vehicle.findOne({ where: { licensePlate: updates.licensePlate } })
      if (existingVehicle) {
        throw new AppError('License plate already exists', 409, 'LICENSE_PLATE_EXISTS')
      }
    }

    // Remove fields that shouldn't be updated directly
    const allowedUpdates = { ...updates }
    delete allowedUpdates.id
    delete allowedUpdates.driverId
    delete allowedUpdates.createdAt
    delete allowedUpdates.updatedAt

    await Vehicle.update(allowedUpdates, { where: { id: vehicleId } })

    const updatedVehicle = await Vehicle.findByPk(vehicleId)
    sendSuccess(res, updatedVehicle.toJSON(), 'Vehicle updated successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Delete vehicle
 */
const deleteVehicle = async (req, res, next) => {
  try {
    const vehicleId = req.params.id
    const driverId = req.driverId

    const vehicle = await Vehicle.findByPk(vehicleId)
    if (!vehicle) {
      throw new AppError('Vehicle not found', 404, 'VEHICLE_NOT_FOUND')
    }

    // Check if vehicle belongs to driver
    if (vehicle.driverId !== driverId) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED')
    }

    // Check if vehicle is currently in use (optional business rule)
    // For now, we'll allow deletion regardless

    await Vehicle.destroy({ where: { id: vehicleId } })

    sendSuccess(res, { vehicleId }, 'Vehicle deleted successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Upload vehicle documents
 */
const uploadDocuments = async (req, res, next) => {
  try {
    const vehicleId = req.params.id
    const driverId = req.driverId
    const { registrationDocUrl, insuranceDocUrl } = req.body

    const vehicle = await Vehicle.findByPk(vehicleId)
    if (!vehicle) {
      throw new AppError('Vehicle not found', 404, 'VEHICLE_NOT_FOUND')
    }

    // Check if vehicle belongs to driver
    if (vehicle.driverId !== driverId) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED')
    }

    // Update document URLs
    await vehicle.update({
      registrationDocUrl: registrationDocUrl || vehicle.registrationDocUrl,
      insuranceDocUrl: insuranceDocUrl || vehicle.insuranceDocUrl
    })

    const updatedVehicle = await Vehicle.findByPk(vehicleId)
    sendSuccess(res, updatedVehicle.toJSON(), 'Vehicle documents updated successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Set vehicle accessibility
 */
const setAccessibility = async (req, res, next) => {
  try {
    const vehicleId = req.params.id
    const driverId = req.driverId
    const { isAccessible } = req.body

    const vehicle = await Vehicle.findByPk(vehicleId)
    if (!vehicle) {
      throw new AppError('Vehicle not found', 404, 'VEHICLE_NOT_FOUND')
    }

    // Check if vehicle belongs to driver
    if (vehicle.driverId !== driverId) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED')
    }

    // Validate isAccessible
    if (typeof isAccessible !== 'boolean') {
      throw new AppError('isAccessible must be a boolean', 400, 'INVALID_ACCESSIBILITY')
    }

    await vehicle.update({ isAccessible })

    const updatedVehicle = await Vehicle.findByPk(vehicleId)
    sendSuccess(res, updatedVehicle.toJSON(), 'Vehicle accessibility updated successfully')
  } catch (error) {
    next(error)
  }
}

module.exports = {
  createVehicle,
  getVehicles,
  getVehicle,
  updateVehicle,
  deleteVehicle,
  uploadDocuments,
  setAccessibility
}