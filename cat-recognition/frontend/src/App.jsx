import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import MarketplaceHome from './pages/marketplace/MarketplaceHome'
import CreateListingPage from './pages/marketplace/CreateListingPage'
import SearchScanPage from './pages/marketplace/SearchScanPage'
import CatListingDetails from './pages/marketplace/CatListingDetails'
import NearbySheltersPage from './pages/marketplace/NearbySheltersPage'
import ClinicCoursesPage from './pages/marketplace/ClinicCoursesPage'
import ClinicQrScanPage from './pages/marketplace/ClinicQrScanPage'
import LostCatsMapPage from './pages/marketplace/LostCatsMapPage'
import ProfileEditPage from './pages/marketplace/ProfileEditPage'
import AuthPage from './pages/marketplace/AuthPage'
import SellerDashboard from './pages/marketplace/SellerDashboard'
import ChatPage from './pages/marketplace/ChatPage'
import CheckoutPage from './pages/marketplace/CheckoutPage'
import OrdersPage from './pages/marketplace/OrdersPage'
import ManageShelterPage from './pages/marketplace/ManageShelterPage'
import EditCatPage from './pages/marketplace/EditCatPage'
import SettingsPage from './pages/marketplace/SettingsPage'
import DatabaseTestPage from './pages/meow/DatabaseTestPage'
import AdminDashboard from './pages/marketplace/AdminDashboard'
import SalesChartPage from './pages/marketplace/SalesChartPage'
import './styles/meow-theme.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MarketplaceHome />} />
        <Route path="/search" element={<SearchScanPage />} />
        <Route path="/sell-dashboard" element={<SellerDashboard />} />
        <Route path="/sell" element={<CreateListingPage />} />
        <Route path="/cat/:id" element={<CatListingDetails />} />
        <Route path="/chat/:sellerId" element={<ChatPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route path="/profile/edit" element={<ProfileEditPage />} />
        <Route path="/manage-shelter" element={<ManageShelterPage />} />
        <Route path="/edit-cat/:id" element={<EditCatPage />} />
        <Route path="/shelters" element={<NearbySheltersPage />} />
        <Route path="/clinics" element={<ClinicCoursesPage />} />
        <Route path="/clinic-scan" element={<ClinicQrScanPage />} />
        <Route path="/lost-cats" element={<LostCatsMapPage />} />
        
        <Route path="/db-test" element={<DatabaseTestPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/sales" element={<SalesChartPage />} />

        {/* Redirects for old routes */}
        <Route path="/owner/*" element={<Navigate to="/" replace />} />
        <Route path="/finder/*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
