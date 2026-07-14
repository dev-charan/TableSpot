// Central tax configuration for SmartAtithi.
// All monetary operations work in integer paise to avoid floating-point errors.

const DEFAULTS = {
  room_gst_rate: 5,        // % GST charged to guest on room price (B2C)
  commission_rate: 15,     // % platform commission on base room amount (B2B)
  commission_gst_rate: 18, // % GST on platform commission (B2B, never shown to guest)
};

/**
 * Calculate the complete hotel pricing breakdown.
 *
 * @param {number|string} baseAmountRupees  Base room booking amount (price × nights × rooms)
 * @param {object}        rates             Override any default rate:
 *                                            room_gst_rate, commission_rate, commission_gst_rate
 * @returns {{
 *   base_amount: number,
 *   room_gst_rate: number,
 *   room_gst_amount: number,
 *   guest_total: number,
 *   commission_rate: number,
 *   commission_amount: number,
 *   commission_gst_rate: number,
 *   commission_gst_amount: number,
 *   hotel_settlement: number,
 * }}
 */
function calculateHotelPricing(baseAmountRupees, rates = {}) {
  const roomGstRate       = Number(rates.room_gst_rate       ?? DEFAULTS.room_gst_rate);
  const commissionRate    = Number(rates.commission_rate      ?? DEFAULTS.commission_rate);
  const commissionGstRate = Number(rates.commission_gst_rate  ?? DEFAULTS.commission_gst_rate);

  const basePaise          = Math.round(parseFloat(baseAmountRupees) * 100);
  const roomGstPaise       = Math.round(basePaise * roomGstRate / 100);
  const guestTotalPaise    = basePaise + roomGstPaise;
  const commissionPaise    = Math.round(basePaise * commissionRate / 100);
  const commissionGstPaise = Math.round(commissionPaise * commissionGstRate / 100);
  const settlementPaise    = guestTotalPaise - commissionPaise - commissionGstPaise;

  return {
    base_amount:          basePaise / 100,
    room_gst_rate:        roomGstRate,
    room_gst_amount:      roomGstPaise / 100,
    guest_total:          guestTotalPaise / 100,
    commission_rate:      commissionRate,
    commission_amount:    commissionPaise / 100,
    commission_gst_rate:  commissionGstRate,
    commission_gst_amount: commissionGstPaise / 100,
    hotel_settlement:     settlementPaise / 100,
  };
}

module.exports = { DEFAULTS, calculateHotelPricing };
