import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { api } from "../lib/api";

export default function CallJoin() {
  const { token } = useParams();
  const [callInfo, setCallInfo] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      const response = await api.resolveCallLink(token);
      if (response.success && response.data) {
        setCallInfo(response.data);
      } else if (!response.success) {
        setError(response.error || "Call link not found");
      }
    };
    load();
  }, [token]);

  const handleJoin = () => {
    if (!token) return;
    window.location.assign(`/call/room/${token}`);
  };

  return (
    <div className="min-h-screen bg-[#000e08] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        {error ? (
          <p className="text-red-600">{error}</p>
        ) : !callInfo ? (
          <p>Loading...</p>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-2">Join Call</h1>
            <p className="text-sm text-gray-600 mb-4">
              {callInfo.scope === "group" ? "Group" : "Direct"} • {callInfo.type}
            </p>
            <button
              onClick={handleJoin}
              className="px-4 py-2 rounded-lg bg-[#20A090] text-white"
            >
              Join Call
            </button>
          </>
        )}
      </div>
    </div>
  );
}
