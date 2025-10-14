import { useAuth } from 'react-oidc-context';

export const LoginButton = () => {
  const auth = useAuth();

  const handleLogin = () => {
    auth.signinRedirect();
  };

  const handleLogout = () => {
    auth.signoutRedirect();
  };

  if (auth.isLoading) {
    return (
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
    );
  }

  if (auth.error) {
    return (
      <div className="text-red-600 text-sm">
        Authentication error: {auth.error.message}
      </div>
    );
  }

  if (auth.isAuthenticated && auth.user) {
    return (
      <div className="flex flex-col gap-2">
        <div className="text-xs text-gray-400">
          Signed in as:
        </div>
        <div className="text-sm text-white truncate">
          {auth.user.profile.email || auth.user.profile.name || 'User'}
        </div>
        <button
          onClick={handleLogout}
          className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleLogin}
      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
    >
      Login
    </button>
  );
};