import { Outlet } from "react-router";

const AUTH_IMAGE_URL =
  "https://images.unsplash.com/photo-1771607068085-b2727abccbb8?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=2000";

export default function AuthLayout() {
  return (
    <div className="min-h-[100dvh] bg-[#0c1116] md:grid md:grid-cols-2">
      <div
        className="relative hidden md:flex flex-col justify-between p-10 text-white"
        style={{
          backgroundImage: `linear-gradient(135deg, rgba(8,16,20,0.75), rgba(8,16,20,0.25)), url(${AUTH_IMAGE_URL})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div>
          <h1 className="text-4xl font-bold tracking-widest">RIVVO</h1>
          <p className="mt-3 max-w-md text-sm text-white/80">
            Secure messaging for people who move fast and stay connected.
          </p>
        </div>
      </div>

      <div className="flex min-h-[100dvh] items-center justify-center p-4 md:p-10">
        <div className="w-full max-w-md">
          <div className="text-center mb-8 md:hidden">
            <h1 className="text-3xl font-bold text-white mb-2">RIVVO</h1>
            <p className="text-gray-400 text-sm">Secure messaging for everyone</p>
          </div>
          <div className="bg-white rounded-3xl p-8 shadow-xl">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
