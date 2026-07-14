import React from 'react';
import LocationSearch from '../../Location/LocationSearch';
import LocationHistory from '../../Location/LocationHistory';

interface LocationInputProps {
  type: 'pickup' | 'dropoff';
  placeholder: string;
  locations: Array<{
    name: string;
    address: string;
    lat: number;
    lng: number;
  }>;
  onSelectLocation: (location: any) => void;
}

const LocationInput: React.FC<LocationInputProps> = ({
  type,
  placeholder,
  locations,
  onSelectLocation
}) => {
  return (
    <div>
      <LocationSearch
        type={type}
        placeholder={placeholder}
        onSelectLocation={onSelectLocation}
      />
      <LocationHistory
        type={type}
        locations={locations}
        onSelectLocation={onSelectLocation}
      />
    </div>
  );
};

export default LocationInput;
