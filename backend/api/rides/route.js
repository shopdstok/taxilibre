// backend/api/rides/route.js
import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';

export const runtime = 'edge'; // Déploiement Edge pour latence minimale

// Cache avec Redis si disponible
const CACHE_TTL = 30; // 30 secondes pour les données temps réel

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  
  // Pagination avec valeurs par défaut
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
  const offset = (page - 1) * limit;
  
  // Filtres optionnels
  const status = searchParams.get('status');
  const driverId = searchParams.get('driverId');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');

  try {
    // Tentative de récupération depuis cache
    const cacheKey = `rides:${page}:${limit}:${status || 'all'}:${driverId || 'all'}:${dateFrom || 'all'}:${dateTo || 'all'}`;
    
    if (!dateFrom && !dateTo) { // Ne pas mettre en cache pour les requêtes en temps réel
      const cached = unstable_cache(
        async () => {
          const rides = await fetchRidesFromDatabase({
            limit,
            offset,
            status,
            driverId,
            dateFrom,
            dateTo
          });
          
          return {
            data: rides,
            pagination: {
              page,
              limit,
              total: rides.total,
              hasMore: offset + rides.length < rides.total
            }
          };
        },
        [cacheKey],
        {
          revalidate: CACHE_TTL,
          tags: ['rides', status || 'all', driverId || 'all']
        }
      );

      if (cached) {
        return NextResponse.json(cached, {
          headers: {
            'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=59',
            'X-Cache': 'HIT'
          }
        });
      }
    }

    // Requête directe à la base de données
    const rides = await fetchRidesFromDatabase({
      limit,
      offset,
      status,
      driverId,
      dateFrom,
      dateTo
    });

    const response = {
      data: rides,
      pagination: {
        page,
        limit,
        total: rides.total,
        hasMore: offset + rides.length < rides.total
      }
    };

    // Mettre en cache les résultats
    if (!dateFrom && !dateTo) {
      unstable_cache(cacheKey, response, {
        revalidate: CACHE_TTL,
        tags: ['rides', status || 'all', driverId || 'all']
      });
    }

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=59',
        'X-Cache': 'MISS',
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });

  } catch (error) {
    
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        message: 'Une erreur est survenue lors de la récupération des courses',
        code: 'RIDES_FETCH_ERROR'
      },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    
    // Validation des données
    const requiredFields = ['passengerId', 'pickup', 'destination', 'paymentMethod'];
    const missingFields = requiredFields.filter(field => !body[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          error: 'Validation Error',
          message: `Champs manquants: ${missingFields.join(', ')}`,
          code: 'VALIDATION_ERROR',
          missingFields
        },
        { 
          status: 400,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
          }
        }
      );
    }

    // Création de la course
    const newRide = await createRideInDatabase(body);

    // Invalider le cache des listes de courses
    unstable_cache('rides:1:20:all:all:all:all', null);
    unstable_cache('rides:1:20:pending:all:all:all', null);

    // Notification temps réel si WebSocket disponible
    if (global.webSocketServer) {
      global.webSocketServer.emit('new_ride', {
        type: 'ride_created',
        data: newRide,
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({
      success: true,
      data: newRide,
      message: 'Course créée avec succès'
    }, {
      status: 201,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });

  } catch (error) {
    
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        message: 'Une erreur est survenue lors de la création de la course',
        code: 'RIDE_CREATE_ERROR'
      },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      }
    );
  }
}

// Fonctions utilitaires (à implémenter)
async function fetchRidesFromDatabase(options) {
  // Implémentation avec votre base de données
  // Cette fonction doit interagir avec PostgreSQL/MySQL/MongoDB
  
  // Mock pour démonstration
  const mockRides = Array.from({ length: options.limit }, (_, i) => ({
    id: options.offset + i + 1,
    passengerId: `passenger_${options.offset + i + 1}`,
    driverId: `driver_${Math.floor(Math.random() * 10) + 1}`,
    pickup: {
      address: `${options.offset + i + 1} Rue Principale, Paris`,
      lat: 48.8566 + (Math.random() - 0.5) * 0.1,
      lng: 2.3522 + (Math.random() - 0.5) * 0.1
    },
    destination: {
      address: `${options.offset + i + 100} Avenue des Champs-Élysées, Paris`,
      lat: 48.8566 + (Math.random() - 0.5) * 0.1,
      lng: 2.3522 + (Math.random() - 0.5) * 0.1
    },
    status: options.status || ['pending', 'accepted', 'in_progress', 'completed'][Math.floor(Math.random() * 4)],
    price: Math.floor(Math.random() * 50) + 10,
    distance: Math.floor(Math.random() * 10) + 1,
    duration: Math.floor(Math.random() * 30) + 5,
    paymentMethod: ['cash', 'card', 'wallet'][Math.floor(Math.random() * 3)],
    createdAt: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
    updatedAt: new Date().toISOString()
  }));

  return {
    data: mockRides,
    total: 1000 // Mock total
  };
}

async function createRideInDatabase(rideData) {
  // Implémentation avec votre base de données
  
  // Mock pour démonstration
  const newRide = {
    id: Date.now(),
    ...rideData,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  return newRide;
}
