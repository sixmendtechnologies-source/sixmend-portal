import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/layout/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Enquiries from "./pages/Enquiries";
import EnquiryDetail from "./pages/EnquiryDetail";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import Expenses from "./pages/Expenses";

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: "#0b0e14" }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#8bc34a", borderTopColor: "transparent" }} />
      </div>
    );
  }
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="enquiries" element={<Enquiries />} />
            <Route path="enquiries/:id" element={<EnquiryDetail />} />
            <Route path="clients" element={<Clients />} />
            <Route path="clients/:id" element={<ClientDetail />} />
            <Route path="expenses" element={<Expenses />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
