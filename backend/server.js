require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { initDB } = require('./config/db');
const setupSocket = require('./socket');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', methods: ['GET', 'POST'] },
});

setupSocket(io);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use((req, res, next) => { req.io = io; next(); });

app.use('/api/auth', require('./routes/auth'));
app.use('/api/restaurants', require('./routes/restaurants'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/tables', require('./routes/tables'));
app.use('/api/menu', require('./routes/menu'));
app.use('/api/hotels', require('./routes/hotels'));
app.use('/api/rooms', require('./routes/rooms'));
app.use('/api/hotel-bookings', require('./routes/hotelBookings'));
app.use('/api/hotel-reviews', require('./routes/hotelReviews'));
app.use('/api/admin', require('./routes/admin'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

initDB()
  .then(() => server.listen(PORT, () => console.log(`Server running on port ${PORT}`)))
  .catch((err) => { console.error('DB init failed:', err); process.exit(1); });
