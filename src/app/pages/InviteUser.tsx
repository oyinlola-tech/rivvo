import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

export default function InviteUser() {
  const { token } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      const response = await api.resolveUserInvite(token);
      if (response.success && response.data) {
        setProfile(response.data);
      } else if (!response.success) {
        setError(response.error || "Invite not found");
      }
    };
    load();
  }, [token]);

  const handleMessage = async () => {
    if (!profile?.id) return;
    const response = await api.getOrCreateConversation(profile.id);
    if (response.success && response.data?.id) {
      navigate(`/messages/${response.data.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#000e08] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        {error ? (
          <p className="text-red-600">{error}</p>
        ) : !profile ? (
          <p>Loading...</p>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-2">{profile.name}</h1>
            <p className="text-sm text-gray-600 mb-4">{profile.email}</p>
            {!user ? (
              <Link
                to="/auth/login"
                className="inline-flex px-4 py-2 rounded-lg bg-[#20A090] text-white"
              >
                Login to message
              </Link>
            ) : (
              <button
                onClick={handleMessage}
                className="px-4 py-2 rounded-lg bg-[#20A090] text-white"
              >
                Message
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
