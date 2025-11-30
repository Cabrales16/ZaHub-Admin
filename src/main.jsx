import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./index.css";

import { AuthProvider } from "./modules/auth/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";

import LoginPage from "./modules/auth/LoginPage";
import ProtectedRoute from "./modules/auth/ProtectedRoute";

import AdminLayout from "./modules/admin/AdminLayout";
import DashboardPage from "./modules/admin/DashboardPage";
import PedidosPage from "./modules/admin/PedidosPage";
import ConfiguracionPage from "./modules/admin/ConfiguracionPage";
import IngredientesPage from "./modules/admin/IngredientesPage";
import PizzasPage from "./modules/admin/PizzasPage";
import UsuariosPage from "./modules/admin/UsuariosPage";
import PedidoDetallePage from "./modules/admin/pages/PedidoDetallePage";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route
              path="/admin/*"
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              {/* /admin → Dashboard */}
              <Route index element={<DashboardPage />} />

              {/* /admin/dashboard → mismo dashboard */}
              <Route path="dashboard" element={<DashboardPage />} />

              <Route path="pedidos" element={<PedidosPage />} />
              <Route path="configuracion" element={<ConfiguracionPage />} />
              <Route path="ingredientes" element={<IngredientesPage />} />
              <Route path="pizzas" element={<PizzasPage />} />
              <Route path="usuarios" element={<UsuariosPage />} />
              <Route path="pedidos/:id" element={<PedidoDetallePage />} />
            </Route>

            {/* Redirección por defecto al dashboard */}
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);