import { useParams } from "react-router";

export default function CallRoom() {
  const { token } = useParams();
  return (
    <div className="min-h-screen bg-[#000e08] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md text-center">
        <h1 className="text-2xl font-bold mb-2">Call Room</h1>
        <p className="text-sm text-gray-600 mb-4">
          Call token: {token}
        </p>
        <p className="text-sm text-gray-600">
          This is the call room placeholder. Wire WebRTC signaling here.
        </p>
      </div>
    </div>
  );
}
