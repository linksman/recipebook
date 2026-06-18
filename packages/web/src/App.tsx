import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import LoginPage from './pages/LoginPage';
import RecipeListPage from './pages/RecipeListPage';
import IngredientsPage from './pages/IngredientsPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/recipes"
            element={
              <PrivateRoute>
                <RecipeListPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/ingredients"
            element={
              <PrivateRoute>
                <IngredientsPage />
              </PrivateRoute>
            }
          />
          <Route path="/" element={<Navigate to="/recipes" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
