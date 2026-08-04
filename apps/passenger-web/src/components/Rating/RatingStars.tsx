import React from 'react';
import { StarBorderOutlined, StarFilled } from '@ant-design/icons';

interface RatingStarsProps {
  rating: number;
  onRatingSelect: (rating: number) => void;
  readOnly?: boolean;
  size?: number;
}

const RatingStars: React.FC<RatingStarsProps> = ({
  rating,
  onRatingSelect,
  readOnly = false,
  size = 24
}) => {
  const stars = [];

  for (let i = 1; i <= 5; i++) {
    const isFilled = rating >= i;
    const isHalf = rating >= i - 0.5 && rating < i;

    stars.push (
      <div
        key={i}
        role="radio"
        aria-checked={isFilled ? 'true' : 'false'}
        aria-label={isFilled 
          ? `${i} étoile${i > 1 ? 's' : ''}` 
          : isHalf 
            ? `${i - 0.5} étoile${i - 0.5 > 1 ? 's' : ''}` 
            : `${i - 1} étoile${i - 1 > 1 ? 's' : ''}`}
        tabIndex={readOnly ? -1 : 0}
        onKeyDown={(e) => {
          if (!readOnly && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onRatingSelect(i);
          }
        }}
        onClick={() => !readOnly && onRatingSelect(i)}
        className={`cursor-pointer inline-flex items-center ${!readOnly ? 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500' : ''}`}
      >
        {isFilled ? (
          <StarFilled
            className={`text-yellow-400 w-${size} h-${size}`}
          />
        ) : isHalf ? (
          <>
            <StarFilled
              className={`text-yellow-400 w-${size} h-${size}`/>
            <StarBorderOutlined
              className={`text-yellow-400 w-${size} h-${size}`/>
            </>
          )
        ) : (
          <StarBorderOutlined
            className={`text-yellow-300 w-${size} h-${size}`}
          />
        )}
      </div>
    );
  }

  return (
    <div 
      className="flex items-center space-x-1"
      role="radiogroup"
      aria-label="Note du trajet"
    >
      {stars}
    </div>
  );
};

export default RatingStars;