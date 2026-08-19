import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App';
import LoginPage from './pages/LoginPage';
import QuestionsPage from './pages/QuestionsPage';
import QuestionViewPage from './pages/QuestionViewPage';
import { isLoggedIn } from './lib/api';
import './styles/global.css';

function RequireAuth({ children }: { children: React.ReactElement }) {
  return isLoggedIn() ? children : <Navigate to="/login" replace />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<App />}>
          <Route
            path="/"
            element={
              <RequireAuth>
                <QuestionsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/q/:sessionId"
            element={
              <RequireAuth>
                <QuestionViewPage />
              </RequireAuth>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
