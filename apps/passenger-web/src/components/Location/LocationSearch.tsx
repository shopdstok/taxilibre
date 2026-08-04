import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsBoxRef = useRef<HTMLDivElement>(null);
  const dispatch = useAppDispatch();
  const { searchResults } = useAppSelector((state: any) => state.location);

  // Handle Escape key to close suggestions
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setSuggestions([]);
      setHighlightedIndex(-1);
      if (inputRef.current) {
        inputRef.current.blur();
      }
    }
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (suggestions.length === 0) return;
      setHighlightedIndex(prev => {
        if (prev >= suggestions.length - 1) return 0;
        return prev + 1;
      });
    }
    
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (suggestions.length === 0) return;
      setHighlightedIndex(prev => {
        if (prev <= 0) return suggestions.length - 1;
        return prev - 1;
      });
    }
    
    if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      if (suggestions[highlightedIndex]) {
        onSelectLocation?.(suggestions[highlightedIndex]);
        setSuggestions([]);
        setHighlightedIndex(-1);
      }
    }
  }, [suggestions, highlightedIndex, onSelectLocation]);

  // Handle clicks outside the component to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setSuggestions([]);
        setHighlightedIndex(-1);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch suggestions when input changes
  useEffect(() => {
    if (!input || input.length < 2) {
      setSuggestions([]);
      setHighlightedIndex(-1);
      return;
    }

    setLoading(true);
    const fetchSuggestions = async () => {
      try {
        const response = await axios.get(
          `https://maps.googleapis.com/maps/api/place/autocomplete/json`,
          {
            params: {
              input,
              types: 'address',
              key: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
              language: 'fr',
              components: 'country:fr'
            }
          }
        );
        setSuggestions(response.data.predictions);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [input]);

  // Handle selecting a suggestion
  const handleSelectSuggestion = (suggestion: any) => {
    if (onSelectLocation) {
      onSelectLocation(suggestion);
    }
    setSuggestions([]);
    setHighlightedIndex(-1);
  };

  // Announce screen reader updates
  const [screenReaderMessage, setScreenReaderMessage] = useState('') as [string, (msg: string) => void];

  useEffect(() => {
    if (loading) {
      setScreenReaderMessage('Recherche en cours...');
    } else if (suggestions.length > 0 && input.length >= 2) {
      setScreenReaderMessage(`${suggestions.length} suggestions disponibles. Utilisez les flèches haut/bas pour naviguer et Entrée pour sélectionner.`);
    } else if (suggestions.length === 0 && input.length >= 2) {
      setScreenReaderMessage('Aucune suggestion trouvée.');
    } else {
      setScreenReaderMessage('');
    }
  }, [loading, suggestions, input]);

  return (
    <div>
      <label htmlFor={`${type}-search`} className="sr-only">
        {type === 'pickup' ? 'Lieu de prise en charge' : 'Lieu de dépose'}
      </label>
      <input
        ref={inputRef}
        id={`${type}-search`}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={type === 'pickup' ? 'Lieu de prise en charge' : 'Lieu de dépose'}
        aria-controls={`${type}-results`}
        aria-expanded={suggestions.length > 0 ? 'true' : 'false'}
        aria-activedescendant={highlightedIndex >= 0 ? `${type}-suggestion-${highlightedIndex}` : undefined}
        className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed`}
        onKeyDown={handleKeyDown}
      />
      
      {/* Loading indicator */}
      {loading && (
        <div className="flex items-center justify-center py-2">
          <div className="animate-spin h-4 w-4 border-t-2 border-b-2 border-indigo-500"></div>
          <span className="ml-2 text-sm text-gray-500">Recherche...</span>
        </div>
      )}
      
      {/* Suggestions list */}
      {suggestions.length > 0 && (
        <div
          ref={resultsBoxRef}
          id={`${type}-results`}
          role="listbox"
          aria-label="Suggestions de lieux"
          className={`absolute z-50 mt-1 w-full max-h-60 overflow-auto border border-gray-300 rounded-lg bg-white shadow-lg`}
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.place_id}
              id={`${type}-suggestion-${index}`}
              role="option"
              aria-selected={highlightedIndex === index}
              className={`relative px-4 py-2 cursor-pointer hover:bg-gray-100 focus:bg-gray-100 ${highlightedIndex === index ? 'bg-indigo-50' : ''}`}
              onClick={() => handleSelectSuggestion(suggestion)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-5h.01M9 16h.01" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">{suggestion.description.split(',')[0]}</div>
                  <div className="text-xs text-gray-500">
                    {suggestion.description.split(',').slice(1).join(',')}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {/* Screen reader live region */}
          <div 
            aria-live="polite" 
            aria-atomic="true" 
            className="sr-only"
          >
            {screenReaderMessage}
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationSearch;