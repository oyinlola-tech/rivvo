import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

export default function InviteGroup() {
  const { token } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [group, setGroup] = useState<any>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      const response = await api.resolveGroupInvite(token);
      if (response.success && response.data) {
        setGroup(response.data);
      } else if (!response.success) {
        setError(response.error || "Invite not found");
      }
    };
    load();
  }, [token]);

  const handleJoin = async () => {
    if (!token) return;
    const response = await api.joinGroupByInvite(token);
    if (response.success) {
      if (response.data?.status === "pending") {
        setStatus("Join request sent. Waiting for approval.");
      } else if (response.data?.groupId) {
        navigate(`/groups/${response.data.groupId}`);
      }
    } else if (!response.success) {
      setError(response.error || "Failed to join");
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#111b21] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        {error ? (
          <p className="text-red-600">{error}</p>
        ) : !group ? (
          <p>Loading...</p>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-2">{group.name}</h1>
            <p className="text-sm text-gray-600 mb-4">{group.description || "No description"}</p>
            {status && <p className="text-sm text-gray-600 mb-3">{status}</p>}
            {!user ? (
              <Link
                to="/auth/login"
                className="inline-flex px-4 py-2 rounded-lg bg-[#1a8c7a] text-white"
              >
                Login to join
              </Link>
            ) : (
              <button
                onClick={handleJoin}
                className="px-4 py-2 rounded-lg bg-[#1a8c7a] text-white"
              >
                {group.isPrivate ? "Request to join" : "Join group"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}



