import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Data init
import { initSeedData } from './data/seed';

// Contexts
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';

// Route guards
import { ProtectedRoute, AdminRoute } from './components/common/ProtectedRoute';

// Layout components
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';

// Customer pages
import Home from './pages/customer/Home';
import Login from './pages/customer/Login';
import Register from './pages/customer/Register';
import Products from './pages/customer/Products';
import ProductDetail from './pages/customer/ProductDetail';
import Cart from './pages/customer/Cart';
import Wishlist from './pages/customer/Wishlist';
import Checkout from './pages/customer/Checkout';
import Orders, { OrderDetail } from './pages/customer/Orders';
import Profile from './pages/customer/Profile';

// Admin pages
import AdminLogin from './pages/admin/AdminLogin';
import AdminLayout from './pages/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import AdminProducts from './pages/admin/AdminProducts';
import AdminOrders from './pages/admin/AdminOrders';
import AdminCustomers from './pages/admin/AdminCustomers';

// Compiler
import { CompilerProvider } from './pages/admin/compiler/CompilerWorkbench';
import { RuleEditor } from './pages/admin/compiler/CompilerWorkbench';
import CompilerDashboard from './pages/admin/compiler/CompilerDashboard';
import { LexerView, ParserView, SemanticView, ASTView, TACView, OptimizerView, CodeGenView } from './pages/admin/compiler/PhaseViews';
import RuleTester from './pages/admin/compiler/RuleTester';
import { SavedRulesView, CompilerHistoryView } from './pages/admin/compiler/SavedRules';
import ConceptsView from './pages/admin/compiler/ConceptsView';

// Global styles
import './styles/global.css';

// Customer layout wrapper
function CustomerLayout({ children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <main style={{ flex: 1 }}>
        {children}
      </main>
      <Footer />
    </div>
  );
}

function App() {
  useEffect(() => {
    initSeedData();
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Routes>
            {/* ── Customer routes ──────────────────────────────────────────── */}
            <Route path="/" element={<CustomerLayout><Home /></CustomerLayout>} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/products" element={<CustomerLayout><Products /></CustomerLayout>} />
            <Route path="/products/:id" element={<CustomerLayout><ProductDetail /></CustomerLayout>} />
            <Route path="/cart" element={
              <ProtectedRoute>
                <CustomerLayout><Cart /></CustomerLayout>
              </ProtectedRoute>
            } />
            <Route path="/wishlist" element={
              <ProtectedRoute>
                <CustomerLayout><Wishlist /></CustomerLayout>
              </ProtectedRoute>
            } />
            <Route path="/checkout" element={
              <ProtectedRoute>
                <CustomerLayout><Checkout /></CustomerLayout>
              </ProtectedRoute>
            } />
            <Route path="/orders" element={
              <ProtectedRoute>
                <CustomerLayout><Orders /></CustomerLayout>
              </ProtectedRoute>
            } />
            <Route path="/orders/:id" element={
              <ProtectedRoute>
                <CustomerLayout><OrderDetail /></CustomerLayout>
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <CustomerLayout><Profile /></CustomerLayout>
              </ProtectedRoute>
            } />

            {/* ── Admin routes ──────────────────────────────────────────────── */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={
              <AdminRoute>
                <CompilerProvider>
                  <AdminLayout />
                </CompilerProvider>
              </AdminRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="customers" element={<AdminCustomers />} />

              {/* Compiler sub-routes */}
              <Route path="compiler" element={<CompilerDashboard />} />
              <Route path="compiler/editor" element={<RuleEditor />} />
              <Route path="compiler/lexer" element={<LexerView />} />
              <Route path="compiler/parser" element={<ParserView />} />
              <Route path="compiler/semantic" element={<SemanticView />} />
              <Route path="compiler/ast" element={<ASTView />} />
              <Route path="compiler/tac" element={<TACView />} />
              <Route path="compiler/optimizer" element={<OptimizerView />} />
              <Route path="compiler/codegen" element={<CodeGenView />} />
              <Route path="compiler/tester" element={<RuleTester />} />
              <Route path="compiler/saved" element={<SavedRulesView />} />
              <Route path="compiler/history" element={<CompilerHistoryView />} />
              <Route path="compiler/concepts" element={<ConceptsView />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
