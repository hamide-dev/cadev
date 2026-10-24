import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { SessionProvider, useSession } from './auth';
import { Login, Signup, SignupChoice, Welcome } from './pages/auth';
import { ConversationScreen, Messages } from './pages/messages';
import { EditProfile, Profile, Settings } from './pages/profile';
import { ProjectDetail, Projects, TaskDetail } from './pages/projects';
import { Compose, Explore, Feed, Notifications, PostDetail, Saved } from './pages/social';
import { BottomNav, Empty, LogoMark } from './ui';
import './styles.css';

function Splash() {
  return (
    <main className="splash" role="status" aria-label="Chargement de Hello World">
      <LogoMark size={96} />
      <p className="mono">
        Hello World&gt;<span className="cursor">_</span>
      </p>
      <span className="spinner" />
    </main>
  );
}

// Écrans réservés aux membres connectés, avec la navigation principale.
function Members({ nav }: { nav?: boolean }) {
  const { user } = useSession();
  if (!user) return <Navigate to="/welcome" replace />;
  return (
    <div className={`app ${nav ? 'has-nav' : ''}`}>
      <Outlet />
      {nav && <BottomNav />}
    </div>
  );
}

function Guests() {
  const { user } = useSession();
  return user ? <Navigate to="/feed" replace /> : <Outlet />;
}

function App() {
  const { ready, user } = useSession();
  if (!ready) return <Splash />;
  return (
    <Routes>
      <Route path="/" element={<Navigate to={user ? '/feed' : '/welcome'} replace />} />
      <Route element={<Guests />}>
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignupChoice />} />
      </Route>
      {/* L'inscription continue une fois connecté (profil et intérêts), elle reste donc accessible. */}
      <Route path="/signup/email" element={<Signup />} />
      <Route element={<Members nav />}>
        <Route path="/feed" element={<Feed />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/u/:username" element={<Profile />} />
      </Route>
      <Route element={<Members />}>
        <Route path="/post/:id" element={<PostDetail />} />
        <Route path="/publish" element={<Compose />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/projects/:id/tasks/:taskId" element={<TaskDetail />} />
        <Route path="/messages/:id" element={<ConversationScreen />} />
        <Route path="/profile/edit" element={<EditProfile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/saved" element={<Saved />} />
      </Route>
      <Route
        path="*"
        element={
          <main className="screen">
            <Empty title="Page introuvable" action={<a href="/" className="btn">Revenir à l’accueil</a>}>
              Ce lien ne mène nulle part.
            </Empty>
          </main>
        }
      />
    </Routes>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <SessionProvider>
        <App />
      </SessionProvider>
    </BrowserRouter>
  </StrictMode>,
);
