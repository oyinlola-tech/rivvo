import { Link } from "react-router";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[100dvh] bg-background flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-[#1a8c7a] mb-4">404</h1>
        <h2 className="text-3xl font-bold mb-4">Page Not Found</h2>
        <p className="text-gray-600 mb-8 max-w-md">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#1a8c7a] text-white rounded-lg hover:bg-[#1a8c7a] transition-colors"
        >
          <Home size={20} />
          <span>Go Home</span>
        </Link>
      </div>
    </div>
  );
}



