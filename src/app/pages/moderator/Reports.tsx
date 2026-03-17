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
    <div className="min-h-screen bg-[#f0f2f5]">
      <div className="bg-[#1a8c7a] text-white shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/70">Moderator</p>
            <h1 className="text-2xl font-semibold">Reports</h1>
          </div>
          <div className="flex gap-2">
            {(["assigned", "unassigned"] as const).map((value) => (
              <button
                key={value}
                onClick={() => setTab(value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  tab === value
                    ? "bg-white text-[#1a8c7a]"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                {value.charAt(0).toUpperCase() + value.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-[#e6e6e6] overflow-hidden">
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
          <div className="divide-y divide-[#eef0f2]">
            {reports.map((report) => (
              <div key={report.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">{report.reason}</h3>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          report.status === "pending"
                            ? "bg-[#fff5cc] text-[#7a5c00]"
                            : "bg-[#dff7ea] text-[#0f5f4c]"
                        }`}
                      >
                        {report.status}
                      </span>
                      {report.type && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#f2f4f6] text-[#5a6a70]">
                          {report.type}
                        </span>
                      )}
                    </div>
                    <p className="text-[#5f6d75] mb-4">{report.description}</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-[#8a98a0] mb-1">Reported User</p>
                        <p className="font-medium">{report.reportedUser.name}</p>
                        <p className="text-[#5f6d75]">{report.reportedUser.email}</p>
                      </div>
                      <div>
                        <p className="text-[#8a98a0] mb-1">Reported By</p>
                        <p className="font-medium">{report.reportedBy.name}</p>
                        <p className="text-[#5f6d75]">{report.reportedBy.email}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                      <div>
                        <span className="text-[#8a98a0] mr-2">Assign to</span>
                        <select
                          value=""
                          onChange={(e) => handleAssign(report.id, e.target.value)}
                          className="border border-[#d6dbe0] rounded-full px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a8c7a]/30"
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
                        className="flex items-center gap-2 text-sm text-[#1a8c7a] hover:text-[#136a5c]"
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
                      className="ml-4 flex items-center gap-2 px-4 py-2 bg-[#1a8c7a] text-white rounded-full hover:bg-[#136a5c] transition-colors"
                    >
                      <CheckCircle size={20} />
                      <span>Resolve</span>
                    </button>
                  )}
                </div>
                {selectedReportId === report.id && (
                  <div className="mt-4 bg-[#f7f9fa] rounded-xl p-4 text-sm border border-[#eef0f2]">
                    <p className="font-semibold mb-2">Last 10 messages (encrypted)</p>
                    {reportMessages.length === 0 ? (
                      <p className="text-[#8a98a0]">No messages captured.</p>
                    ) : (
                      <div className="space-y-2">
                        {reportMessages.map((msg) => (
                          <div key={msg.id} className="border-b border-[#e6e9ed] pb-2">
                            <p className="text-xs text-[#8a98a0]">
                              {msg.senderName} - {new Date(msg.createdAt).toLocaleString()}
                            </p>
                            <p className="text-[#4b5961]">
                              {msg.encrypted ? "Encrypted message" : msg.body}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <p className="text-xs text-[#8a98a0]">
                  {new Date(report.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}


