import { useEffect, useState } from "react";
import { api } from "../../lib/api";

export default function ModeratorAuditLog() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      const response = await api.getModerationAuditLogs();
      if (response.success && response.data) {
        setLogs(response.data);
      } else if (!response.success) {
        setError(response.error || "Failed to load audit log");
      }
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Audit Log</h1>
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#25D366]"></div>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-600">{error}</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No audit events</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-100">
          {logs.map((log) => (
            <div key={log.id} className="p-4">
              <p className="font-semibold">{log.action}</p>
              <p className="text-sm text-gray-600">
                {log.admin?.name} {log.admin?.email ? `(${log.admin.email})` : ""}
              </p>
              <p className="text-xs text-gray-500">
                {new Date(log.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

