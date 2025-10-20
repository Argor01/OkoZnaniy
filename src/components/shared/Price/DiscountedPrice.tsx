import React from 'react';
import { Typography } from 'antd';

const { Text } = Typography;

interface DiscountedPriceProps {
  originalPrice: number;
  discountAmount?: number;
  finalPrice?: number;
}

export const DiscountedPrice: React.FC<DiscountedPriceProps> = ({
  originalPrice,
  discountAmount = 0,
  finalPrice,
}: DiscountedPriceProps) => {
  const displayFinalPrice = finalPrice || originalPrice - discountAmount;
  const hasDiscount = discountAmount > 0;

  return (
    <span className="discounted-price">
      {hasDiscount ? (
        <>
          <Text delete className="original-price">
            {originalPrice} ₽
          </Text>
          <Text type="success" className="final-price">
            {displayFinalPrice} ₽
          </Text>
          <Text type="secondary" className="discount">
            (-{discountAmount} ₽)
          </Text>
        </>
      ) : (
        <Text>{displayFinalPrice} ₽</Text>
      )}

      <style jsx>{`
        .discounted-price {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        :global(.original-price) {
          color: #999;
        }
        :global(.final-price) {
          font-weight: 500;
        }
        :global(.discount) {
          font-size: 0.85em;
        }
      `}</style>
    </span>
  );
}; 