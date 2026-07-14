// 🚗 TaxiLibre - Types Partagés

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export enum UserRole {
  ADMIN = 'admin',
  DRIVER = 'driver',
  PASSENGER = 'passenger'
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending'
}

export interface Driver extends User {
  role: UserRole.DRIVER;
  licenseNumber: string;
  vehicle: Vehicle;
  documents: Document[];
  stats: DriverStats;
  isOnline: boolean;
  currentLocation?: Location;
}

export interface Passenger extends User {
  role: UserRole.PASSENGER;
  preferredPaymentMethod?: PaymentMethod;
  savedAddresses: Address[];
}

export interface Vehicle {
  id: string;
  driverId: string;
  make: string;
  model: string;
  year: number;
  color: string;
  licensePlate: string;
  type: VehicleType;
  documents: Document[];
  photo?: string;
}

export enum VehicleType {
  STANDARD = 'standard',
  PREMIUM = 'premium',
  XL = 'xl',
  TAXI = 'taxi'
}

export interface Document {
  id: string;
  userId: string;
  type: DocumentType;
  url: string;
  status: DocumentStatus;
  uploadedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
}

export enum DocumentType {
  LICENSE = 'license',
  INSURANCE = 'insurance',
  REGISTRATION = 'registration',
  ID_CARD = 'id_card',
  PASSPORT = 'passport'
}

export enum DocumentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

export interface Ride {
  id: string;
  passengerId: string;
  driverId?: string;
  vehicleId?: string;
  status: RideStatus;
  pickup: Location;
  destination: Location;
  estimatedPrice?: number;
  estimatedDuration?: number;
  estimatedDistance?: number;
  actualPrice?: number;
  actualDuration?: number;
  actualDistance?: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  createdAt: string;
  assignedAt?: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  cancelledBy?: string;
}

export enum RideStatus {
  REQUESTED = 'requested',
  ASSIGNED = 'assigned',
  DRIVER_ARRIVED = 'driver_arrived',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export interface Location {
  lat: number;
  lng: number;
  address?: string;
  city?: string;
  country?: string;
}

export interface Address extends Location {
  id: string;
  userId: string;
  name: string;
  isDefault: boolean;
  type: AddressType;
}

export enum AddressType {
  HOME = 'home',
  WORK = 'work',
  OTHER = 'other'
}

export interface Payment {
  id: string;
  rideId: string;
  passengerId: string;
  driverId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  stripePaymentIntentId?: string;
  paypalOrderId?: string;
  createdAt: string;
  processedAt?: string;
}

export enum PaymentMethod {
  CARD = 'card',
  PAYPAL = 'paypal',
  CASH = 'cash',
  WALLET = 'wallet'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded'
}

export interface DriverStats {
  driverId: string;
  totalRides: number;
  totalEarnings: number;
  averageRating: number;
  acceptanceRate: number;
  onlineHours: number;
  weeklyRides: number;
  weeklyEarnings: number;
  lastActiveAt?: string;
  lastRideAt?: string;
}

export interface Rating {
  id: string;
  rideId: string;
  passengerId: string;
  driverId: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: string;
}

export enum NotificationType {
  RIDE_REQUESTED = 'ride_requested',
  RIDE_ASSIGNED = 'ride_assigned',
  RIDE_STARTED = 'ride_started',
  RIDE_COMPLETED = 'ride_completed',
  RIDE_CANCELLED = 'ride_cancelled',
  PAYMENT_PROCESSED = 'payment_processed',
  DRIVER_APPROVED = 'driver_approved',
  DRIVER_REJECTED = 'driver_rejected'
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface RideRequest {
  passengerId: string;
  pickup: Location;
  destination: Location;
  vehicleType: VehicleType;
  paymentMethod: PaymentMethod;
  estimatedPrice?: number;
}

export interface RideEstimate {
  distance: number;
  duration: number;
  price: number;
  priceBreakdown: {
    base: number;
    distance: number;
    time: number;
    service: number;
    total: number;
  };
}

export interface DriverLocation {
  driverId: string;
  location: Location;
  heading?: number;
  speed?: number;
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  rideId: string;
  senderId: string;
  receiverId: string;
  message: string;
  type: MessageType;
  createdAt: string;
  readAt?: string;
}

export enum MessageType {
  TEXT = 'text',
  LOCATION = 'location',
  SYSTEM = 'system'
}

export interface EarningsReport {
  driverId: string;
  period: 'daily' | 'weekly' | 'monthly';
  startDate: string;
  endDate: string;
  totalEarnings: number;
  totalRides: number;
  averagePerRide: number;
  commission: number;
  netEarnings: number;
  breakdown: {
    rides: number;
    tips: number;
    bonuses: number;
  };
}

export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  description: string;
  category: SupportCategory;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export enum SupportCategory {
  RIDE_ISSUE = 'ride_issue',
  PAYMENT_PROBLEM = 'payment_problem',
  ACCOUNT_HELP = 'account_help',
  TECHNICAL_ISSUE = 'technical_issue',
  OTHER = 'other'
}

export enum TicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed'
}

export enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}
