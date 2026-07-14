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
        onClick={() => !readOnly && onRatingSelect(i)}
        onMouseEnter={() => !readOnly && onRatingSelect(i)}
        onMouseLeave={() => !readOnly && onRatingSelect(rating)}
        className="cursor-pointer inline-flex items-center"
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
    <div className="flex items-center space-x-1">
      {stars}
    </div>
  );
};

export default RatingStars;
