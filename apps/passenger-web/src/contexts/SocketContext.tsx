import React, { createContext, useContext, useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

// Define types for socket context
interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  requestRide: (rideData: any) => void;
  cancelRide: (rideId: string, reason: string) => void;
  trackRide: (rideId: string) => void;
  sendMessage: (message: string) => void;
}

// Define types for socket event data (based on usage in the code)
interface RideAcceptedData {
  eta: number;
  // Add other properties as needed
}

interface RideCompletedData {
  rideId: string;
  // Add other properties as needed
}

interface RideCancelledData {
  reason: string;
  // Add other properties as needed
}

interface DriverLocationUpdateData {
  latitude: number;
  longitude: number;
  // Add other properties as needed
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      const newSocket = io(process.env.VITE_WS_URL || 'http://localhost:3003', {
        auth: {
          token: localStorage.getItem('taxilibre_token'),
          userId: user.id,
          role: 'passenger'
        }
      });

      newSocket.on('connect', () => {
        setConnected(true);
        toast.success('Connected to ride service');
      });

      newSocket.on('disconnect', () => {
        setConnected(false);
        toast.error('Connection lost');
      });

      // Ride events
      newSocket.on('ride_accepted', (data: RideAcceptedData) => {
        toast.success(`Driver accepted your ride! ETA: ${data.eta} minutes`);
      });

      newSocket.on('driver_arrived', () => {
        toast.success('Your driver has arrived!');
      });

      newSocket.on('ride_started', () => {
        toast.success('Your ride has started');
      });

      newSocket.on('ride_completed', (data: RideCompletedData) => {
        toast.success('Your ride has completed');
        // Navigate to payment page
        window.location.href = `/payment/${data.rideId}`;
      });

      newSocket.on('ride_cancelled', (data: RideCancelledData) => {
        toast.error(`Ride cancelled: ${data.reason}`);
      });

      newSocket.on('driver_location_update', (data: DriverLocationUpdateData) => {
        // Update driver location on map
        window.dispatchEvent(new CustomEvent('driverLocationUpdate', {
          detail: {
            latitude: data.latitude,
            longitude: data.longitude
          }
        }));
      });

      // Error handling
      newSocket.on('error', (error: any) => {
        toast.error(error.message || 'Connection error');
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    }
  }, [isAuthenticated, user]);

  const requestRide = (rideData: any) => {
    if (socket && connected) {
      socket.emit('ride_request', rideData);
    } else {
      toast.error('Not connected to server');
    }
  };

  const cancelRide = (rideId: string, reason: string) => {
    if (socket && connected) {
      socket.emit('ride_cancel', { rideId, reason });
    }
  };

  const trackRide = (rideId: string) => {
    if (socket && connected) {
      socket.emit('track_ride', { rideId });
    }
  };

  const sendMessage = (message: string) => {
    if (socket && connected) {
      socket.emit('message', message);
    }
  };

  const value: SocketContextType = {
    socket,
    connected,
    requestRide,
    cancelRide,
    trackRide,
    sendMessage
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
