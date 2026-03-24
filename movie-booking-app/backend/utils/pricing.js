/**
 * Dynamic pricing with discount slabs (server-side only)
 * Discounts:
 *   1-2 seats  → 0% off
 *   3-4 seats  → 5% off
 *   5-7 seats  → 10% off
 *   8+ seats   → 15% off
 *
 * Time-based surge:
 *   Peak hours (6pm–11pm) → +20% surcharge
 *   Off-peak (before noon) → -10%
 */

const DISCOUNT_SLABS = [
  { min: 8, discount: 0.15, label: "15% group discount" },
  { min: 5, discount: 0.1, label: "10% group discount" },
  { min: 3, discount: 0.05, label: "5% group discount" },
  { min: 1, discount: 0, label: "No discount" },
];

const getDiscountSlab = (seatCount) => {
  return DISCOUNT_SLABS.find((s) => seatCount >= s.min);
};

const getSurcharge = (showTime) => {
  const hour = new Date(showTime).getHours();
  if (hour >= 18 && hour < 23) return { rate: 0.2, label: "Peak hour surcharge" };
  if (hour < 12) return { rate: -0.1, label: "Morning discount" };
  return { rate: 0, label: null };
};

const calculatePrice = (basePrice, seats, showTime) => {
  const seatCount = seats.length;
  const slab = getDiscountSlab(seatCount);
  const surcharge = getSurcharge(showTime);

  const baseTotal = basePrice * seatCount;
  const discountAmount = baseTotal * slab.discount;
  const surchargeAmount = baseTotal * surcharge.rate;

  const finalPrice = Math.round(baseTotal - discountAmount + surchargeAmount);

  return {
    baseTotal,
    discountPercent: slab.discount * 100,
    discountAmount: Math.round(discountAmount),
    surchargePercent: surcharge.rate * 100,
    surchargeAmount: Math.round(surchargeAmount),
    finalPrice,
    discountLabel: slab.discount > 0 ? slab.label : null,
    surchargeLabel: surcharge.label,
  };
};

module.exports = { calculatePrice, getDiscountSlab, getSurcharge };
