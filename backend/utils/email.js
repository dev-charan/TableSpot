const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM || 'SmartAtithi <onboarding@resend.dev>';
const APP = process.env.APP_NAME || 'SmartAtithi';
const URL = process.env.CLIENT_URL || 'http://localhost:5173';
const ADMIN_EMAIL = (process.env.ADMIN_GOOGLE_EMAILS || '').split(',')[0].trim();

const send = async (to, subject, html) => {
  try {
    await resend.emails.send({ from: FROM, to, subject, html });
  } catch (err) {
    console.error('[Email]', err.message);
  }
};

// ── Layout helpers ────────────────────────────────────────────────
const wrap = (body) => `<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 16px">
<tr><td align="center">
<table width="100%" style="max-width:580px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07)">
  <tr><td style="background:#111;padding:24px 32px">
    <table cellpadding="0" cellspacing="0"><tr>
      <td style="background:#f97316;border-radius:8px;width:36px;height:36px;text-align:center;vertical-align:middle;font-size:18px">🍽️</td>
      <td style="padding-left:10px;color:#fff;font-size:20px;font-weight:700">${APP}</td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:32px">${body}</td></tr>
  <tr><td style="background:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb">
    <p style="margin:0;color:#9ca3af;font-size:12px">&copy; ${new Date().getFullYear()} ${APP}. All rights reserved.</p>
    <p style="margin:6px 0 0"><a href="${URL}" style="color:#f97316;font-size:12px;text-decoration:none">Visit ${APP}</a></p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

const h1 = (t) => `<h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111">${t}</h1>`;
const sub = (t) => `<p style="margin:0 0 20px;color:#6b7280;font-size:14px;line-height:1.6">${t}</p>`;
const hr = () => `<hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">`;
const btn = (label, href, color = '#f97316') =>
  `<div style="text-align:center;margin-top:24px"><a href="${href}" style="display:inline-block;background:${color};color:#fff;text-decoration:none;padding:13px 32px;border-radius:10px;font-weight:600;font-size:15px">${label}</a></div>`;
const row = (label, value) =>
  `<tr><td style="padding:7px 0;color:#9ca3af;font-size:13px;width:42%">${label}</td><td style="padding:7px 0;color:#111;font-size:13px;font-weight:600">${value}</td></tr>`;
const table = (rows) => `<table width="100%" cellpadding="0" cellspacing="0">${rows}</table>`;
const refBox = (ref, color = '#22c55e') =>
  `<div style="background:#f9fafb;border-radius:12px;padding:20px;text-align:center;margin:20px 0">
    <p style="margin:0 0 4px;color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:1px">Booking Reference</p>
    <p style="margin:0;font-size:30px;font-weight:800;font-family:monospace;color:${color};letter-spacing:4px">${ref}</p>
  </div>`;
const alert = (text, color = '#f97316') =>
  `<div style="background:${color}10;border-left:3px solid ${color};border-radius:8px;padding:12px 16px;margin:16px 0">
    <p style="margin:0;color:#111;font-size:13px">${text}</p>
  </div>`;

// ── 1. Welcome — Guest ────────────────────────────────────────────
const welcomeGuest = (to, name) => send(to, `Welcome to ${APP}! 🎉`, wrap(`
  ${h1(`Welcome, ${name.split(' ')[0]}! 🎉`)}
  ${sub(`You're now part of ${APP}. Discover and book the best restaurants and hotels near you.`)}
  ${table(
    row('🍽️ Restaurants', 'Browse &amp; reserve tables instantly') +
    row('🏨 Hotels', 'Find rooms &amp; book in seconds') +
    row('⭐ Reviews', 'Rate your experiences')
  )}
  ${btn(`Start Exploring`, URL)}
`));

// ── 2. Welcome — Host (restaurant/hotel owner) ────────────────────
const welcomeHost = (to, name, role) => {
  const isHotel = role === 'hotel_owner';
  const type = isHotel ? 'Hotel' : 'Restaurant';
  const dashUrl = `${URL}/${isHotel ? 'hotel-dashboard/register' : 'dashboard/register-restaurant'}`;
  return send(to, `Welcome to ${APP} — Your ${type} account is ready`, wrap(`
    ${h1(`Welcome aboard, ${name.split(' ')[0]}! ${isHotel ? '🏨' : '🍽️'}`)}
    ${sub(`Your ${type} Owner account is ready. List your property and start receiving bookings.`)}
    ${table(row('Account Type', `${type} Owner`) + row('Next Step', `List your ${type.toLowerCase()}`))}
    ${btn(`List Your ${type}`, dashUrl, isHotel ? '#3b82f6' : '#f97316')}
  `));
};

// ── 3. Booking Confirmed — Restaurant (to guest) ──────────────────
const bookingConfirmedRestaurant = (to, { restaurantName, date, timeSlot, partySize, ref, mapsUrl }) =>
  send(to, `Booking Confirmed at ${restaurantName} — Ref: ${ref}`, wrap(`
    <div style="text-align:center;margin-bottom:20px"><span style="font-size:40px">✅</span></div>
    ${h1('Booking Confirmed!')}
    ${sub('Your table is reserved. Show this reference at the restaurant.')}
    ${refBox(ref)}
    ${table(
      row('Restaurant', restaurantName) +
      row('Date', date) +
      row('Time', timeSlot) +
      row('Party Size', `${partySize} ${partySize == 1 ? 'guest' : 'guests'}`)
    )}
    ${alert('⏰ The restaurant will confirm your booking shortly.')}
    ${mapsUrl ? btn('📍 Get Directions', mapsUrl, '#111') : ''}
  `));

// ── 4. Booking Confirmed — Hotel (to guest) ───────────────────────
const bookingConfirmedHotel = (to, { hotelName, checkIn, checkOut, nights, guests, rooms, roomName, totalPrice, ref, mapsUrl }) =>
  send(to, `Hotel Booking Confirmed at ${hotelName} — Ref: ${ref}`, wrap(`
    <div style="text-align:center;margin-bottom:20px"><span style="font-size:40px">🏨</span></div>
    ${h1('Hotel Booking Confirmed!')}
    ${sub('Your room is reserved. Enjoy your stay!')}
    ${refBox(ref, '#3b82f6')}
    ${table(
      row('Hotel', hotelName) +
      row('Room', roomName) +
      row('Check-in', checkIn) +
      row('Check-out', checkOut) +
      row('Duration', `${nights} night${nights > 1 ? 's' : ''}`) +
      row('Guests', `${guests} guest${guests > 1 ? 's' : ''} · ${rooms} room${rooms > 1 ? 's' : ''}`) +
      row('Total Amount', `₹${parseFloat(totalPrice).toLocaleString('en-IN')}`)
    )}
    ${mapsUrl ? btn('📍 Get Directions', mapsUrl, '#3b82f6') : ''}
  `));

// ── 5. Payment Receipt (to guest) ────────────────────────────────
const paymentReceipt = (to, { entityName, ref, breakdown, bookingType }) => {
  const isHotel = bookingType === 'hotel';
  const color = isHotel ? '#3b82f6' : '#f97316';
  return send(to, `Payment Confirmed — ${entityName} (Ref: ${ref})`, wrap(`
    <div style="text-align:center;margin-bottom:20px"><span style="font-size:40px">💳</span></div>
    ${h1('Payment Successful!')}
    ${sub(`Your payment for ${entityName} is confirmed.`)}
    <div style="background:#f0fdf4;border-radius:12px;padding:20px;margin:20px 0;border:1px solid #bbf7d0">
      ${table(
        (isHotel && breakdown.booking_amount > 0 ? row('Room Price', `₹${parseFloat(breakdown.booking_amount).toLocaleString('en-IN')}`) : '') +
        (!isHotel ? row('Booking Fee', `₹${parseFloat(breakdown.commission).toFixed(2)}`) : '') +
        (isHotel ? row(`Commission (${breakdown.commission_rate}%)`, `₹${parseFloat(breakdown.commission).toFixed(2)}`) : '') +
        (breakdown.gst > 0 ? row(`GST (${breakdown.gst_rate}%)`, `₹${parseFloat(breakdown.gst).toFixed(2)}`) : '') +
        `<tr><td colspan="2"><hr style="border:none;border-top:1px solid #bbf7d0;margin:8px 0"></td></tr>` +
        `<tr><td style="padding:8px 0;color:#15803d;font-size:15px;font-weight:700">Total Paid</td>
             <td style="padding:8px 0;color:#15803d;font-size:15px;font-weight:700">₹${parseFloat(breakdown.total).toFixed(2)}</td></tr>`
      )}
      ${breakdown.gst_number ? `<p style="margin:12px 0 0;color:#6b7280;font-size:11px">GST: ${breakdown.gst_number} · ${breakdown.business_name}</p>` : ''}
    </div>
    ${btn('View My Bookings', `${URL}/my-bookings`, color)}
  `));
};

// ── 6. New Booking — Restaurant Owner ────────────────────────────
const ownerNewRestaurantBooking = (to, { ownerName, restaurantName, guestName, guestEmail, date, timeSlot, partySize, ref }) =>
  send(to, `New Booking at ${restaurantName} — Ref: ${ref}`, wrap(`
    ${h1(`New Table Reservation! 🎉`)}
    ${sub(`Hi ${ownerName.split(' ')[0]}, you have a new booking at ${restaurantName}.`)}
    ${table(
      row('Reference', ref) +
      row('Guest', guestName) +
      row('Guest Email', guestEmail) +
      row('Date', date) +
      row('Time', timeSlot) +
      row('Party Size', `${partySize} ${partySize == 1 ? 'guest' : 'guests'}`)
    )}
    ${btn('Manage Bookings', `${URL}/dashboard/bookings`)}
  `));

// ── 7. New Booking — Hotel Owner ──────────────────────────────────
const ownerNewHotelBooking = (to, { ownerName, hotelName, guestName, guestEmail, checkIn, checkOut, nights, guests, rooms, roomName, totalPrice, ref }) =>
  send(to, `New Booking at ${hotelName} — Ref: ${ref}`, wrap(`
    ${h1(`New Room Reservation! 🏨`)}
    ${sub(`Hi ${ownerName.split(' ')[0]}, you have a new booking at ${hotelName}.`)}
    ${table(
      row('Reference', ref) +
      row('Guest', guestName) +
      row('Guest Email', guestEmail) +
      row('Room', roomName) +
      row('Check-in', checkIn) +
      row('Check-out', checkOut) +
      row('Duration', `${nights} night${nights > 1 ? 's' : ''}`) +
      row('Guests', `${guests} · ${rooms} room${rooms > 1 ? 's' : ''}`) +
      row('Total', `₹${parseFloat(totalPrice).toLocaleString('en-IN')}`)
    )}
    ${btn('Manage Bookings', `${URL}/hotel-dashboard/bookings`, '#3b82f6')}
  `));

// ── 8. Admin — New User Registered ───────────────────────────────
const adminNewUser = (userName, userEmail, userRole) => {
  if (!ADMIN_EMAIL) return;
  const roleLabel = { user: 'Diner', restaurant_owner: 'Restaurant Owner', hotel_owner: 'Hotel Owner', admin: 'Admin' }[userRole] || userRole;
  return send(ADMIN_EMAIL, `New ${roleLabel} joined ${APP}: ${userName}`, wrap(`
    ${h1('New User Registered')}
    ${sub(`A new ${roleLabel} has joined ${APP}.`)}
    ${table(row('Name', userName) + row('Email', userEmail) + row('Role', roleLabel))}
    ${btn('View in Admin Panel', `${URL}/admin/users`, '#7c3aed')}
  `));
};

// ── 9. Admin — Payout Due ─────────────────────────────────────────
const adminPayoutDue = (count, totalAmount) => {
  if (!ADMIN_EMAIL) return;
  return send(ADMIN_EMAIL, `${count} payout${count > 1 ? 's' : ''} due on ${APP}`, wrap(`
    ${h1(`${count} Payout${count > 1 ? 's' : ''} Due Today`)}
    ${sub(`The following hotel owner payouts are due and waiting to be processed.`)}
    ${table(row('Payouts Due', count) + row('Total Amount', `₹${parseFloat(totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`))}
    ${alert('Please process these payouts and mark them as paid in the admin panel.')}
    ${btn('Go to Payouts', `${URL}/admin/payouts`, '#7c3aed')}
  `));
};

module.exports = {
  welcomeGuest,
  welcomeHost,
  bookingConfirmedRestaurant,
  bookingConfirmedHotel,
  paymentReceipt,
  ownerNewRestaurantBooking,
  ownerNewHotelBooking,
  adminNewUser,
  adminPayoutDue,
};
