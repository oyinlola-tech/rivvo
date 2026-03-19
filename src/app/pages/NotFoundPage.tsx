import { useNavigate } from 'react-router';
import { Home } from 'lucide-react';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center px-4">
        <h1 className="text-9xl text-primary mb-4">404</h1>
        <h2 className="text-3xl text-foreground mb-4">Page Not Found</h2>
        <p className="text-muted-foreground mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity mx-auto"
        >
          <Home className="w-5 h-5" />
          <span>Go Home</span>
        </button>
      </div>
    </div>
  );
}
