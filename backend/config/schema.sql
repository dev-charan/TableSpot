CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  google_id VARCHAR(255),
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'restaurant_owner', 'hotel_owner', 'owner', 'admin')),
  phone VARCHAR(20),
  avatar VARCHAR(500),
  no_show_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  cuisine_type VARCHAR(100),
  address TEXT NOT NULL,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100) DEFAULT 'India',
  lat DECIMAL(10,8),
  lng DECIMAL(11,8),
  phone VARCHAR(20),
  website VARCHAR(500),
  opening_hours JSONB DEFAULT '{"open": "11:00", "close": "23:00"}',
  price_range INTEGER DEFAULT 2 CHECK (price_range BETWEEN 1 AND 4),
  cover_image VARCHAR(500),
  images TEXT[] DEFAULT '{}',
  osm_id VARCHAR(100),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('pending', 'active', 'suspended')),
  avg_rating DECIMAL(3,2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  total_bookings INTEGER DEFAULT 0,
  ai_summary TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  table_number VARCHAR(20) NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  location VARCHAR(50) DEFAULT 'indoor' CHECK (location IN ('indoor', 'outdoor', 'bar', 'private')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  table_id UUID REFERENCES tables(id) ON DELETE SET NULL,
  booking_date DATE NOT NULL,
  time_slot VARCHAR(20) NOT NULL,
  party_size INTEGER NOT NULL CHECK (party_size > 0),
  status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
  special_requests TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  ai_highlight BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(booking_id)
);

CREATE TABLE IF NOT EXISTS menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES menu_categories(id) ON DELETE CASCADE,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  image VARCHAR(500),
  is_available BOOLEAN DEFAULT true,
  is_must_try BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blackout_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  blackout_date DATE NOT NULL,
  reason VARCHAR(200),
  UNIQUE(restaurant_id, blackout_date)
);

CREATE INDEX IF NOT EXISTS idx_bookings_restaurant_date ON bookings(restaurant_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_restaurant ON reviews(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_city ON restaurants(city);
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant ON menu_items(restaurant_id);

-- ============ HOTEL MODULE ============


CREATE TABLE IF NOT EXISTS hotels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  star_rating INTEGER DEFAULT 3 CHECK (star_rating BETWEEN 1 AND 5),
  hotel_type VARCHAR(50) DEFAULT 'hotel' CHECK (hotel_type IN ('hotel', 'resort', 'hostel', 'apartment', 'villa', 'boutique')),
  address TEXT NOT NULL,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100) DEFAULT 'India',
  lat DECIMAL(10,8),
  lng DECIMAL(11,8),
  phone VARCHAR(20),
  website VARCHAR(500),
  amenities TEXT[] DEFAULT '{}',
  check_in_time VARCHAR(10) DEFAULT '14:00',
  check_out_time VARCHAR(10) DEFAULT '11:00',
  cover_image VARCHAR(500),
  images TEXT[] DEFAULT '{}',
  osm_id VARCHAR(100),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('pending', 'active', 'suspended')),
  avg_rating DECIMAL(3,2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  total_bookings INTEGER DEFAULT 0,
  ai_summary TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS room_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price_per_night DECIMAL(10,2) NOT NULL CHECK (price_per_night > 0),
  max_occupancy INTEGER DEFAULT 2 CHECK (max_occupancy > 0),
  total_rooms INTEGER DEFAULT 1 CHECK (total_rooms > 0),
  amenities TEXT[] DEFAULT '{}',
  images TEXT[] DEFAULT '{}',
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hotel_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
  room_type_id UUID REFERENCES room_types(id) ON DELETE SET NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  guests INTEGER DEFAULT 1 CHECK (guests > 0),
  rooms INTEGER DEFAULT 1 CHECK (rooms > 0),
  total_price DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
  special_requests TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  CHECK (check_out > check_in)
);

CREATE TABLE IF NOT EXISTS hotel_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES hotel_bookings(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(booking_id)
);

CREATE TABLE IF NOT EXISTS hotel_blackout_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
  blackout_date DATE NOT NULL,
  reason VARCHAR(200),
  UNIQUE(hotel_id, blackout_date)
);

CREATE INDEX IF NOT EXISTS idx_hotel_bookings_hotel ON hotel_bookings(hotel_id);
CREATE INDEX IF NOT EXISTS idx_hotel_bookings_user ON hotel_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_hotel_bookings_dates ON hotel_bookings(hotel_id, check_in, check_out);
CREATE INDEX IF NOT EXISTS idx_hotel_reviews_hotel ON hotel_reviews(hotel_id);
CREATE INDEX IF NOT EXISTS idx_hotels_city ON hotels(city);
CREATE INDEX IF NOT EXISTS idx_room_types_hotel ON room_types(hotel_id);

-- ============ REVIEW VISIBILITY ============
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT true;
ALTER TABLE hotel_reviews ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT true;

-- ============ MAPS URL ============
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS maps_url VARCHAR(500);
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS maps_url VARCHAR(500);

-- ============ PAYMENT MODULE ============
CREATE TABLE IF NOT EXISTS payment_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  is_payment_enabled BOOLEAN DEFAULT false,
  hotel_commission_rate DECIMAL(5,2) DEFAULT 0,
  restaurant_fee_per_person DECIMAL(10,2) DEFAULT 0,
  gst_rate DECIMAL(5,2) DEFAULT 0,
  gst_number VARCHAR(50),
  business_name VARCHAR(200),
  updated_at TIMESTAMP DEFAULT NOW()
);
INSERT INTO payment_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  booking_type VARCHAR(20) CHECK (booking_type IN ('restaurant', 'hotel')),
  razorpay_order_id VARCHAR(200) UNIQUE,
  razorpay_payment_id VARCHAR(200),
  razorpay_signature TEXT,
  booking_amount DECIMAL(10,2) NOT NULL,
  commission_amount DECIMAL(10,2) DEFAULT 0,
  gst_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  commission_rate DECIMAL(5,2) DEFAULT 0,
  gst_rate DECIMAL(5,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES payments(id);
ALTER TABLE hotel_bookings ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES payments(id);

-- Payout scheduling per entity
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS payout_schedule_days INTEGER DEFAULT 7;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS payout_schedule_days INTEGER DEFAULT 7;

-- Default payout days in settings
ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS default_payout_days INTEGER DEFAULT 7;

-- Track which entity this payment is for
ALTER TABLE payments ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS entity_type VARCHAR(20);

-- Payout ledger
CREATE TABLE IF NOT EXISTS payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  owner_name VARCHAR(200),
  owner_email VARCHAR(255),
  entity_type VARCHAR(20) CHECK (entity_type IN ('restaurant', 'hotel')),
  entity_id UUID,
  entity_name VARCHAR(200),
  gross_amount DECIMAL(10,2) NOT NULL,
  commission_amount DECIMAL(10,2) DEFAULT 0,
  gst_amount DECIMAL(10,2) DEFAULT 0,
  net_amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'due', 'paid', 'failed')),
  paid_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payouts_status_due ON payouts(status, due_date);
CREATE INDEX IF NOT EXISTS idx_payouts_owner ON payouts(owner_id);

