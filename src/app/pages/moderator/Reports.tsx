import { useEffect, useState } from "react";
import { CheckCircle, ClipboardList, UserX } from "lucide-react";
import { api } from "../../lib/api";

interface Report {
  id: string;
  reportedUser: { id: string; name: string; email: string };
  reportedBy: { id: string; name: string; email: string };
  reason: string;
  description?: string;
  status: "pending" | "resolved";
  type?: "user" | "message";
  createdAt: string;
}

export default function ModeratorReports() {
  const [assigned, setAssigned] = useState<Report[]>([]);
  const [unassigned, setUnassigned] = useState<Report[]>([]);
  const [moderators, setModerators] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [reportMessages, setReportMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"assigned" | "unassigned">("assigned");

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setError("");
    const [assignedResp, unassignedResp, modsResp] = await Promise.all([
      api.getModerationReports(),
      api.getModerationUnassignedReports(),
      api.getModeratorsList(),
    ]);

    if (assignedResp.success && assignedResp.data) {
      setAssigned(assignedResp.data);
    }
    if (unassignedResp.success && unassignedResp.data) {
      setUnassigned(unassignedResp.data);
    }
    if (modsResp.success && modsResp.data) {
      setModerators(modsResp.data);
    }
    if (!assignedResp.success || !unassignedResp.success) {
      setError(assignedResp.error || unassignedResp.error || "Failed to load reports");
    }
    setLoading(false);
  };

  const handleResolve = async (reportId: string) => {
    const response = await api.resolveModerationReport(reportId);
    if (!response.success) {
      setError(response.error || "Failed to resolve report");
      return;
    }
    setAssigned((prev) => prev.map((r) => (r.id === reportId ? { ...r, status: "resolved" } : r)));
  };

  const handleAssign = async (reportId: string, moderatorId: string) => {
    if (!moderatorId) return;
    const response = await api.assignModerationReport(reportId, moderatorId);
    if (!response.success) {
      setError(response.error || "Failed to assign report");
      return;
    }
    await loadAll();
  };

  const handleBan = async (userId: string, email: string) => {
    const confirmBan = window.confirm(`Ban ${email}?`);
    if (!confirmBan) return;
    const response = await api.updateModerationUserStatus(userId, "suspended");
    if (!response.success) {
      setError(response.error || "Failed to ban user");
    }
  };

  const handleLoadMessages = async (reportId: string) => {
    const response = await api.getModerationReportMessages(reportId);
    if (response.success && response.data) {
      setSelectedReportId(reportId);
      setReportMessages(response.data);
    } else if (!response.success) {
      setError(response.error || "Failed to load report messages");
    }
  };

  const reports = tab === "assigned" ? assigned : unassigned;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Moderation Reports</h1>
        <div className="flex gap-2">
          {(["assigned", "unassigned"] as const).map((value) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                tab === value ? "bg-[#1a8c7a] text-white" : "bg-gray-100 text-gray-600"
              }`}
            >
              {value.charAt(0).toUpperCase() + value.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1a8c7a]"></div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600">{error}</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardList className="mx-auto mb-4 text-gray-400" size={48} />
            <p className="text-gray-500">No reports found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {reports.map((report) => (
              <div key={report.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">{report.reason}</h3>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          report.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {report.status}
                      </span>
                      {report.type && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          {report.type}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 mb-4">{report.description}</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500 mb-1">Reported User</p>
                        <p className="font-medium">{report.reportedUser.name}</p>
                        <p className="text-gray-600">{report.reportedUser.email}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 mb-1">Reported By</p>
                        <p className="font-medium">{report.reportedBy.name}</p>
                        <p className="text-gray-600">{report.reportedBy.email}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                      <div>
                        <span className="text-gray-500 mr-2">Assign to</span>
                        <select
                          value=""
                          onChange={(e) => handleAssign(report.id, e.target.value)}
                          className="border rounded-md px-2 py-1 text-sm"
                        >
                          <option value="">Select moderator</option>
                          {moderators.map((mod) => (
                            <option key={mod.id} value={mod.id}>
                              {mod.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        onClick={() => handleLoadMessages(report.id)}
                        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
                      >
                        <ClipboardList size={16} /> View last 10 messages
                      </button>
                      <button
                        onClick={() => handleBan(report.reportedUser.id, report.reportedUser.email)}
                        className="flex items-center gap-2 text-sm text-red-600 hover:text-red-800"
                      >
                        <UserX size={16} /> Ban user
                      </button>
                    </div>
                  </div>
                  {report.status === "pending" && tab === "assigned" && (
                    <button
                      onClick={() => handleResolve(report.id)}
                      className="ml-4 flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                    >
                      <CheckCircle size={20} />
                      <span>Resolve</span>
                    </button>
                  )}
                </div>
                {selectedReportId === report.id && (
                  <div className="mt-4 bg-gray-50 rounded-lg p-4 text-sm">
                    <p className="font-semibold mb-2">Last 10 messages (encrypted)</p>
                    {reportMessages.length === 0 ? (
                      <p className="text-gray-500">No messages captured.</p>
                    ) : (
                      <div className="space-y-2">
                        {reportMessages.map((msg) => (
                          <div key={msg.id} className="border-b border-gray-200 pb-2">
                            <p className="text-xs text-gray-500">
                              {msg.senderName} â€¢ {new Date(msg.createdAt).toLocaleString()}
                            </p>
                            <p className="text-gray-700">
                              {msg.encrypted ? "Encrypted message" : msg.body}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <p className="text-xs text-gray-500">
                  {new Date(report.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


