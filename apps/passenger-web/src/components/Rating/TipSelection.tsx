import React from 'react';

interface TipSelectionProps {
  selectedTip: number;
  onTipChange: (tip: number) => void;
}

const TipSelection: React.FC<TipSelectionProps> = ({
  selectedTip,
  onTipChange
}) => {
  const tipOptions = [0, 1, 2, 5]; // in euros

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-medium text-gray-700">Pourboire</span>
        <span className="text-sm text-gray-500">
          {selectedTip > 0 ? `${selectedTip}€` : 'Aucun'}
        </span>
      </div>
      <div className="flex space-x-2">
        {tipOptions.map(tip => (
          <label key={tip} className="flex items-center cursor-pointer">
            <input
              type="radio"
              checked={selectedTip === tip}
              onChange={() => onTipChange(tip)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm font-medium text-gray-700">
              {tip === 0 ? 'Aucun' : `${tip}€`}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
};

export default TipSelection;
