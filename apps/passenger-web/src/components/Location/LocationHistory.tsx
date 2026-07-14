import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';

interface LocationHistoryProps {
  type: 'pickup' | 'dropoff';
  locations: Array<{
    name: string;
    address: string;
    lat: number;
    lng: number;
  }>;
  onSelectLocation?: (location: any) => void;
}

const LocationHistory: React.FC<LocationHistoryProps> = ({
  type,
  locations = [],
  onSelectLocation
}) => {
  const dispatch = useAppDispatch();

  const handleSelect = (location: any) => {
    if (type === 'pickup') {
      dispatch.setPickupLocation(location);
    } else {
      dispatch.setDropoffLocation(location);
    }
    // Clear search results when a location is selected
    dispatch.clearSearchResults();
    if (onSelectLocation) {
      onSelectLocation(location);
    }
  };

  return (
    <div className="mt-4">
      <h3 className="font-medium text-gray-700 mb-2">
        {type === 'pickup' ? 'Lieux de prise en charge récents' : 'Destinations récentes'}
      </h3>
      {locations.length === 0 ? (
        <p className="text-sm text-gray-500">
          Aucun historique pour le moment
        </p>
      ) : (
        <div className="space-y-2">
          {locations.map((location, index) => (
            <div
              key={index}
              onClick={() => handleSelect(location)}
              className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <div className="flex justify-between">
                <div>
                  <div className="font-medium">{location.name}</div>
                  <div className="text-sm text-gray-600">{location.address}</div>
                </div>
                <div className="text-xs text-gray-400">
                  {/* Distance calculation would go here */}
                  ·
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LocationHistory;
