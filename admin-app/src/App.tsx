import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import Login from './pages/auth/Login';
import Dashboard from './pages/dashboard/Dashboard';
import { ROUTES } from './utils/constants';

// Lazy load pages for code splitting
import { lazy, Suspense } from 'react';
import Loader from './components/common/Loader';

const UserList = lazy(() => import('./pages/users/UserList'));
const UserDetail = lazy(() => import('./pages/users/UserDetail'));
const ChannelList = lazy(() => import('./pages/channels/ChannelList'));
const ChannelDetail = lazy(() => import('./pages/channels/ChannelDetail'));
const VideoList = lazy(() => import('./pages/videos/VideoList'));
const VideoDetail = lazy(() => import('./pages/videos/VideoDetail'));
const ProgramList = lazy(() => import('./pages/programs/ProgramList'));
const ProgramDetail = lazy(() => import('./pages/programs/ProgramDetail'));
const LivestreamList = lazy(() => import('./pages/livestreams/LivestreamList'));
const LivestreamDetail = lazy(() => import('./pages/livestreams/LivestreamDetail'));
const NotificationSend = lazy(() => import('./pages/notifications/NotificationSend'));

// Get basename for router - in production, app is served from /admin
const basename = import.meta.env.PROD ? '/admin' : '/';

function App() {
  return (
    <BrowserRouter basename={basename}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute>
                <Suspense fallback={<Loader />}>
                  <UserList />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/users/:id"
            element={
              <ProtectedRoute>
                <Suspense fallback={<Loader />}>
                  <UserDetail />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/channels"
            element={
              <ProtectedRoute>
                <Suspense fallback={<Loader />}>
                  <ChannelList />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/channels/:id"
            element={
              <ProtectedRoute>
                <Suspense fallback={<Loader />}>
                  <ChannelDetail />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/videos"
            element={
              <ProtectedRoute>
                <Suspense fallback={<Loader />}>
                  <VideoList />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/videos/:id"
            element={
              <ProtectedRoute>
                <Suspense fallback={<Loader />}>
                  <VideoDetail />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/programs"
            element={
              <ProtectedRoute>
                <Suspense fallback={<Loader />}>
                  <ProgramList />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/programs/:id"
            element={
              <ProtectedRoute>
                <Suspense fallback={<Loader />}>
                  <ProgramDetail />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/livestreams"
            element={
              <ProtectedRoute>
                <Suspense fallback={<Loader />}>
                  <LivestreamList />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/livestreams/:id"
            element={
              <ProtectedRoute>
                <Suspense fallback={<Loader />}>
                  <LivestreamDetail />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <Suspense fallback={<Loader />}>
                  <NotificationSend />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
          <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
