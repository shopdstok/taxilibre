import { useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAppDispatch } from '@/store';
import { setRideId, setRideStatus, setError as setRideError } from '@/store/rideSlice';
import { RideRequestData } from '@/types/ride';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3003';

export const useRideCreation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dispatch = useAppDispatch();

  const createRide = useCallback(async (
    pickup: { lat: number; lng: number },
    destination?: { lat: number; lng: number }
  ) => {
    setLoading(true);
    setError(null);
    try {
      const socket: Socket = io(SOCKET_URL, {
        transports: ['websocket'],
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000
      });

      // 1️⃣ appel REST pour créer le trajet en DB
      const res = await fetch('/api/rides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pickup, destination }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`Échec création trajet: ${res.status}`);
      const ride = await res.json();
      dispatch(setRideId(ride.id));
      dispatch(setRideStatus('pending'));

      // 2️⃣ rejoindre la room Socket.io pour ce trajet
      socket.emit('join-ride', ride.id);

      // 3️⃣ gestion des événements de matching
      const handleEvents = () => {
        socket.on('ride-request', (data: RideRequestData) => {
          console.debug('[Passager] Demande de trajet diffusée:', data.rideId);
        });

        socket.on('ride-matched', (matched: { rideId: string; driverId: string; eta: number }) => {
          dispatch(setRideStatus('matched'));
          socket.disconnect();
        });

        socket.on('ride-not-found', () => {
          dispatch(setRideStatus('failed'));
          setError('Aucun conducteur disponible après plusieurs tentatives. Veuillez réessayer plus tard.');
          socket.disconnect();
        });

        socket.on('connect_error', (err) => {
          setError(`Erreur de connexion Socket.io: ${err.message}`);
          setLoading(false);
        });

        socket.on('disconnect', (reason) => {
          if (reason !== 'io server disconnect') {
            setError('Connexion perdue. Tentative de reconnexion...');
          }
        });
      };

      handleEvents();

      // Nettoyage automatique au démontage du composant
      return () => {
        socket.disconnect();
      };
    } catch (err: any) {
      setError(err.message ?? 'Erreur inattendue lors de la création du trajet');
      setLoading(false);
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  return { createRide, loading, error };
};
