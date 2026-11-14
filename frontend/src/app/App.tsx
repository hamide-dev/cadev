import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { LogoMark } from '../components/Brand';
import { AuthLayout } from '../features/auth/AuthLayout';
import { Login } from '../features/auth/Login';
import { OAuthCallback } from '../features/auth/OAuthCallback';
import { OAuthOnboarding } from '../features/auth/OAuthOnboarding';
import { Signup } from '../features/auth/Signup';
import { SignupChoice } from '../features/auth/SignupChoice';
import { Welcome } from '../features/auth/Welcome';
import { Explore } from '../features/explore/Explore';
import { ConversationScreen } from '../features/messages/Conversation';
import { ConversationPlaceholder, MessagesLayout } from '../features/messages/Messages';
import { Notifications } from '../features/notifications/Notifications';
import { Compose } from '../features/posts/Compose';
import { Feed } from '../features/posts/Feed';
import { PostDetail } from '../features/posts/PostDetail';
import { EditProfile } from '../features/profile/EditProfile';
import { Profile } from '../features/profile/Profile';
import { Saved } from '../features/profile/Saved';
import { Settings } from '../features/profile/Settings';
import { ProjectDetail } from '../features/projects/ProjectDetail';
import { Projects } from '../features/projects/Projects';
import { TaskDetail } from '../features/projects/TaskDetail';
import { useSession } from '../lib/session';
import { NotFound } from './NotFound';
import { Shell } from './Shell';

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

function Guests() {
  const { user } = useSession();
  return user ? <Navigate to="/feed" replace /> : <Outlet />;
}

export function App() {
  const { ready, user } = useSession();
  if (!ready) return <Splash />;
  return (
    <Routes>
      <Route path="/" element={<Navigate to={user ? '/feed' : '/welcome'} replace />} />
      <Route path="/oauth/callback" element={<OAuthCallback />} />
      <Route element={<AuthLayout />}>
        <Route element={<Guests />}>
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignupChoice />} />
        </Route>
        {/* L'inscription continue une fois connecté (profil et intérêts), elle reste donc accessible. */}
        <Route path="/signup/email" element={<Signup />} />
      </Route>
      <Route element={<Shell />}>
        <Route path="/signup/oauth" element={<OAuthOnboarding />} />
        <Route path="/feed" element={<Feed />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/u/:username" element={<Profile />} />
        <Route path="/post/:id" element={<PostDetail />} />
        <Route path="/publish" element={<Compose />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/projects/:id/tasks/:taskId" element={<TaskDetail />} />
        <Route path="/messages" element={<MessagesLayout />}>
          <Route index element={<ConversationPlaceholder />} />
          <Route path=":id" element={<ConversationScreen />} />
        </Route>
        <Route path="/profile/edit" element={<EditProfile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/saved" element={<Saved />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
