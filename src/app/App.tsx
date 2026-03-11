import { RouterProvider } from "react-router";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "./contexts/AuthContext";
import { router } from "./routes";

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;