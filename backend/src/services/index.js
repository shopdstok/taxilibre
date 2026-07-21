const analyticsService = require("./analyticsService")
const auditLogService = require("./auditLogService")
const emailService = require("./emailService")
const eventBus = require("./eventBus")
const geofencingService = require("./geofencingService")
const geolocationService = require("./geolocationService")
const jwtService = require("./jwtService")
const locationService = require("./locationService")
const loggingService = require("./loggingService")
const matchingService = require("./matchingService")
const mfaService = require("./mfaService")
const notificationService = require("./notificationService")
const oauth2Service = require("./oauth2Service")
const optimization = require("./optimization")
const otpService = require("./otpService")
const priceEstimationService = require("./priceEstimationService")
const pricingService = require("./pricingService")
const promoService = require("./promoService")
const pushNotificationService = require("./pushNotificationService")
const refreshTokenService = require("./refreshTokenService")
const smsService = require("./smsService")
const socketService = require("./socketService")
const stripeService = require("./stripe")

module.exports = {
  analyticsService,
  auditLogService,
  emailService,
  eventBus,
  geofencingService,
  geolocationService,
  jwtService,
  locationService,
  loggingService,
  matchingService,
  mfaService,
  notificationService,
  oauth2Service,
  optimization,
  otpService,
  priceEstimationService,
  pricingService,
  promoService,
  pushNotificationService,
  refreshTokenService,
  smsService,
  socketService,
  stripeService
}
