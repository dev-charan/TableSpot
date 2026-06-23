import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import RestaurantDetail from './pages/RestaurantDetail';
import UserDashboard from './pages/UserDashboard';
import RestaurantDashboard from './pages/dashboard/RestaurantDashboard';
import RegisterRestaurant from './pages/dashboard/RegisterRestaurant';
import ManageBookings from './pages/dashboard/ManageBookings';
import ManageTables from './pages/dashboard/ManageTables';
import MenuUpload from './pages/dashboard/MenuUpload';
import EditRestaurant from './pages/dashboard/EditRestaurant';
import Hotels from './pages/Hotels';
import HotelDetail from './pages/HotelDetail';
import HotelDashboard from './pages/dashboard/hotel/HotelDashboard';
import RegisterHotel from './pages/dashboard/hotel/RegisterHotel';
import ManageRooms from './pages/dashboard/hotel/ManageRooms';
import ManageHotelBookings from './pages/dashboard/hotel/ManageHotelBookings';
import EditHotel from './pages/dashboard/hotel/EditHotel';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminRestaurants from './pages/admin/AdminRestaurants';
import AdminHotels from './pages/admin/AdminHotels';
import AdminBookings from './pages/admin/AdminBookings';
import AdminReviews from './pages/admin/AdminReviews';
import Profile from './pages/Profile';
import BookingConfirmation from './pages/BookingConfirmation';

const ProtectedRoute = ({ children }) => {
  const { isLoggedIn } = useAuth();
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return children;
};

const OwnerRoute = ({ children }) => {
  const { isLoggedIn, user } = useAuth();
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (user?.role !== 'restaurant_owner' && user?.role !== 'admin') return <Navigate to="/" replace />;
  return children;
};

const AdminRoute = ({ children }) => {
  const { isLoggedIn, user } = useAuth();
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (user?.role !== 'admin') return <Navigate to="/" replace />;
  return children;
};

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/restaurant/:id" element={<RestaurantDetail />} />

        <Route path="/hotels" element={<Hotels />} />
        <Route path="/hotel/:id" element={<HotelDetail />} />

        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/booking/confirmation" element={<ProtectedRoute><BookingConfirmation /></ProtectedRoute>} />
        <Route path="/my-bookings" element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />

        <Route path="/dashboard/register-restaurant" element={<OwnerRoute><RegisterRestaurant /></OwnerRoute>} />
        <Route path="/dashboard" element={<OwnerRoute><RestaurantDashboard /></OwnerRoute>}>
          <Route path="bookings" element={<ManageBookings />} />
          <Route path="tables" element={<ManageTables />} />
          <Route path="menu" element={<MenuUpload />} />
          <Route path="edit" element={<EditRestaurant />} />
        </Route>

        <Route path="/hotel-dashboard/register" element={<ProtectedRoute><RegisterHotel /></ProtectedRoute>} />
        <Route path="/hotel-dashboard" element={<ProtectedRoute><HotelDashboard /></ProtectedRoute>}>
          <Route path="bookings" element={<ManageHotelBookings />} />
          <Route path="rooms" element={<ManageRooms />} />
          <Route path="edit" element={<EditHotel />} />
        </Route>

        <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="restaurants" element={<AdminRestaurants />} />
          <Route path="hotels" element={<AdminHotels />} />
          <Route path="bookings" element={<AdminBookings />} />
          <Route path="reviews" element={<AdminReviews />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
