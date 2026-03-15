import { Outlet } from "react-router";

export default function AuthLayout() {
  return (
    <div className="min-h-[100dvh] bg-[#111b21] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">RIVVO</h1>
          <p className="text-gray-400 text-sm">Secure messaging for everyone</p>
        </div>
        <div className="bg-white rounded-3xl p-8 shadow-xl">
          <Outlet />
        </div>
      </div>
    </div>
  );
}


