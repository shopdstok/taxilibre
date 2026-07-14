import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';
import { WS_URL } from '../config/api';
import * as Notifications from 'expo-notifications';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const { user, token, isAuthenticated } = useAuth();

  // Configure notifications
  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  }, []);

  // Initialize socket connection
  useEffect(() => {
    if (isAuthenticated && token && user) {
      const newSocket = io(WS_URL, {
        auth: {
          token,
          userId: user.id,
          role: user.role
        },
        transports: ['websocket']
      });

      newSocket.on('connect', () => {
        setConnected(true);
      });

      newSocket.on('disconnect', () => {
        setConnected(false);
      });

      // Passenger events
      if (user.role === 'passenger') {
        newSocket.on('ride_accepted', async (data) => {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Driver Accepted!',
              body: `Your driver is on the way. ETA: ${data.eta} minutes`,
              data: { type: 'ride_accepted', rideId: data.rideId },
            },
            trigger: null,
          });
        });

        newSocket.on('driver_arrived', async () => {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Driver Arrived!',
              body: 'Your driver has arrived at the pickup location',
            },
            trigger: null,
          });
        });

        newSocket.on('ride_started', async () => {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Ride Started',
              body: 'Your ride has begun. Enjoy your trip!',
            },
            trigger: null,
          });
        });

        newSocket.on('ride_completed', async (data) => {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Ride Completed',
              body: 'Thank you for riding with TaxiLibre!',
              data: { type: 'ride_completed', rideId: data.rideId },
            },
            trigger: null,
          });
        });

        newSocket.on('ride_cancelled', async (data) => {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Ride Cancelled',
              body: data.reason || 'Your ride has been cancelled',
            },
            trigger: null,
          });
        });

        newSocket.on('driver_location_update', (data) => {
          // Handle location updates for active ride
          // This would update the map in the ActiveRideScreen
        });
      }

      // Driver events
      if (user.role === 'driver') {
        newSocket.on('ride_request', async (data) => {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'New Ride Request!',
              body: `Ride from ${data.pickupAddress} to ${data.dropoffAddress}`,
              data: { type: 'ride_request', rideData: data },
            },
            trigger: null,
          });
        });

        newSocket.on('ride_cancelled_by_passenger', async (data) => {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Ride Cancelled',
              body: data.reason || 'Passenger cancelled the ride',
            },
            trigger: null,
          });
        });
      }

      // Common events
      newSocket.on('chat_message', async (data) => {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `Message from ${data.senderName}`,
            body: data.message,
            data: { type: 'chat_message', rideId: data.rideId },
          },
          trigger: null,
        });
      });

      newSocket.on('error', (error) => {
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    } else {
      // Disconnect socket if not authenticated
      if (socket) {
        socket.close();
        setSocket(null);
        setConnected(false);
      }
    }
  }, [isAuthenticated, token, user]);

  // Socket methods
  const requestRide = (rideData) => {
    if (socket && connected) {
      socket.emit('ride_request', rideData);
    }
  };

  const acceptRide = (rideId, eta) => {
    if (socket && connected) {
      socket.emit('ride_response', { rideId, accepted: true, eta });
    }
  };

  const rejectRide = (rideId) => {
    if (socket && connected) {
      socket.emit('ride_response', { rideId, accepted: false });
    }
  };

  const updateLocation = (latitude, longitude) => {
    if (socket && connected) {
      socket.emit('location_update', { latitude, longitude });
    }
  };

  const updateRideStatus = (rideId, status, metadata = {}) => {
    if (socket && connected) {
      socket.emit('ride_status_update', { rideId, status, ...metadata });
    }
  };

  const cancelRide = (rideId, reason) => {
    if (socket && connected) {
      socket.emit('ride_cancel', { rideId, reason });
    }
  };

  const sendMessage = (rideId, message) => {
    if (socket && connected) {
      socket.emit('chat_message', { rideId, message });
    }
  };

  const trackRide = (rideId) => {
    if (socket && connected) {
      socket.emit('track_ride', { rideId });
    }
  };

  const value = {
    socket,
    connected,
    requestRide,
    acceptRide,
    rejectRide,
    updateLocation,
    updateRideStatus,
    cancelRide,
    sendMessage,
    trackRide
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
