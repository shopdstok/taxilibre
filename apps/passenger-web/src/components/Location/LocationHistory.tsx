import React from 'react';

interface LocationHistoryProps {
  type: 'pickup' | 'dropoff';
  locations: Array<{
    name: string;
    address: string;
    lat: number;
    lng: number;
  }>;
  onSelectLocation: (location: any) => void;
}

const LocationHistory: React.FC<LocationHistoryProps> = ({
  type,
  locations,
  onSelectLocation
}) => {
  // Use useMemo to prevent unnecessary re-renders
  const sortedLocations = React.useMemo(() => {
    // Sort by most recent first
    return [...locations].sort((a, b) => 
      (b.timestamp || 0) - (a.timestamp || 0)
    );
  }, [locations]);

  return (
    <div>
      <h3 className="sr-only">{type === 'pickup' ? 'Historique des lieux de prise en charge' : 'Historique des lieux de dépose'}</h3>
      {sortedLocations.length > 0 && (
        <div className="space-y-2">
          {sortedLocations.map((location, index) => (
            <div
              key={`${location.lat}-${location.lng}`}
              role="option"
              aria-setsize={sortedLocations.length}
              aria-posinset={index + 1}
              className="flex items-start space-x-3 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 focus-within:ring-2 focus-within:ring-indigo-500"
              tabindex="0"
              onClick={() => onSelectLocation(location)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectLocation(location);
                }
              }}
            >
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-5h.01M9 16h.01" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                  {location.name}
                </div>
                <div className="text-xs text-gray-500 truncate max-w-[200px]">
                  {location.address}
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