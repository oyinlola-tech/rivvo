import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { api } from "../lib/api";

export default function GroupHandle() {
  const { handle } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    const resolve = async () => {
      if (!handle) return;
      const response = await api.getGroupByHandle(handle);
      if (response.success && response.data?.id) {
        navigate(`/groups/${response.data.id}`, { replace: true });
      } else if (!response.success) {
        setError(response.error || response.message || "Group not found");
      }
    };
    resolve();
  }, [handle, navigate]);

  if (!handle) return null;

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-[#0b141a] md:ml-64">
      <div className="bg-white rounded-2xl shadow-sm p-6 text-center max-w-md mx-auto">
        <h1 className="text-lg font-semibold text-[#111b21]">Group</h1>
        <p className="text-sm text-[#667781] mt-2">
          {error || "Opening group..."}
        </p>
      </div>
    </div>
  );
}
