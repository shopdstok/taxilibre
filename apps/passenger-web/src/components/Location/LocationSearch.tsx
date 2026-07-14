import React, { useState, useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import axios from 'axios';

interface LocationSearchProps {
  type: 'pickup' | 'dropoff';
  placeholder?: string;
  onSelectLocation?: (location: any) => void;
  disabled?: boolean;
}

const LocationSearch: React.FC<LocationSearchProps> = ({
  type,
  placeholder = 'Enter location',
  onSelectLocation,
  disabled = false
}) => {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<Array<any>>([]);
  const [loading, setLoading] = useState(false);
  const dispatch = useAppDispatch();
  const { searchResults } = useAppSelector((state: any) => state.location);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(`/api/v1/location/autocomplete`, {
        params: {
          input: query,
          // In a real app, we might send current location for biasing
        }
      });
      setSuggestions(response.data.data.predictions || []);
    } catch (error) {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (input.length >= 2) {
      fetchSuggestions(input);
    } else {
      setSuggestions([]);
    }
  }, [input, fetchSuggestions]);

  const handleSelect = (suggestion: any) => {
    setInput(suggestion.description);
    setSuggestions([]);

    // Get detailed place information
    axios.get(`/api/v1/location/geocode`, {
      params: {
        address: suggestion.description
      }
    }).then(response => {
      const locationData = response.data.data;
      if (type === 'pickup') {
        dispatch.setPickupLocation(locationData);
      } else {
        dispatch.setDropoffLocation(locationData);
      }
      // Note: clearLocationSearchResults doesn't exist in our store yet
      // We'll need to add this or handle it differently
      if (onSelectLocation) {
        onSelectLocation(locationData);
      }
    }).catch(error => {
      // Error handled silently - could add toast notification if desired
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && suggestions.length > 0) {
      handleSelect(suggestions[0]);
    }
  };

  return (
    <div className="relative">
      <input
        type="text"
        placeholder={placeholder}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={handleKeyPress}
        disabled={disabled}
        className={`w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
      />
      {!disabled && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              onClick={() => handleSelect(suggestion)}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
            >
              <div className="font-medium">{suggestion.description}</div>
              {suggestion.structured_formatting && (
                <div className="text-xs text-gray-500">{suggestion.structured_formatting.secondary_text}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LocationSearch;
