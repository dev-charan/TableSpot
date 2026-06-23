CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'restaurant_owner', 'admin')),
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

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('user', 'restaurant_owner', 'hotel_owner', 'owner', 'admin'));

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
