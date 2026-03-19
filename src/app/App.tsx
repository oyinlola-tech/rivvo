import { RouterProvider } from 'react-router';
import { Suspense, useEffect } from 'react';
import { router } from './routes';
import { AuthProvider } from './contexts/AuthContext';
import { ChatProvider } from './contexts/ChatContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Toaster } from 'sonner';
import { prefetchAppChunks } from './prefetch';

export default function App() {
  useEffect(() => {
    const schedule = (cb: () => void) => {
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(cb);
      } else {
        setTimeout(cb, 500);
      }
    };
    schedule(prefetchAppChunks);
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <ChatProvider>
          <Suspense
            fallback={
              <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
              </div>
            }
          >
            <RouterProvider router={router} />
          </Suspense>
          <Toaster position="top-center" richColors />
        </ChatProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
