import { useState, useEffect } from "react";
import { Flag, CheckCircle, UserX, ClipboardList } from "lucide-react";
import { api } from "../../lib/api";

interface Report {
  id: string;
  reportedUser: {
    id: string;
    name: string;
    email: string;
  };
  reportedBy: {
    id: string;
    name: string;
    email: string;
  };
  reason: string;
  description: string;
  status: "pending" | "resolved";
  type?: "user" | "message";
  assignedModerator?: { id: string; name: string; email: string } | null;
  reportedMessageId?: string | null;
  conversationId?: string | null;
  createdAt: string;
}

export default function AdminReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [moderators, setModerators] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [reportMessages, setReportMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "resolved">("all");

  useEffect(() => {
    loadReports();
    loadModerators();
  }, []);

  const loadReports = async () => {
    setError("");
    const response = await api.getReports();
    if (response.success && response.data) {
      setReports(response.data);
    } else if (!response.success) {
      setError(response.error || "Failed to load reports");
    }
    setLoading(false);
  };

  const loadModerators = async () => {
    const response = await api.getModerators();
    if (response.success && response.data) {
      setModerators(response.data);
    } else if (!response.success) {
      setError(response.error || "Failed to load moderators");
    }
  };

  const handleAssign = async (reportId: string, moderatorId: string) => {
    const response = await api.assignReport(reportId, moderatorId || null);
    if (response.success) {
      setReports(
        reports.map((report) =>
          report.id === reportId
            ? {
                ...report,
                assignedModerator: moderators.find((mod) => mod.id === moderatorId) || null,
              }
            : report
        )
      );
    } else if (!response.success) {
      setError(response.error || "Failed to assign report");
    }
  };

  const handleBan = async (email: string, userId: string) => {
    const confirmBan = window.confirm(`Ban ${email}?`);
    if (!confirmBan) return;
    const response = await api.updateUserStatus(userId, "suspended");
    if (!response.success) {
      setError(response.error || "Failed to ban user");
    }
  };

  const handleLoadReportMessages = async (reportId: string) => {
    const response = await api.getReportMessages(reportId);
    if (response.success && response.data) {
      setSelectedReportId(reportId);
      setReportMessages(response.data);
    } else if (!response.success) {
      setError(response.error || "Failed to load report messages");
    }
  };

  const handleResolve = async (reportId: string) => {
    const response = await api.resolveReport(reportId);
    if (response.success) {
      setReports(
        reports.map((report) =>
          report.id === reportId ? { ...report, status: "resolved" } : report
        )
      );
    } else if (!response.success) {
      setError(response.error || "Failed to resolve report");
    }
  };

  const filteredReports = reports.filter((report) => {
    if (filter === "all") return true;
    return report.status === filter;
  });

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      <div className="bg-[#1a8c7a] text-white shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/70">Admin</p>
            <h1 className="text-2xl font-semibold">Reports</h1>
          </div>
          <div className="flex gap-2">
            {(["all", "pending", "resolved"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  filter === status
                    ? "bg-white text-[#1a8c7a]"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
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
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-12">
            <Flag className="mx-auto mb-4 text-gray-400" size={48} />
            <p className="text-gray-500">No reports found</p>
          </div>
        ) : (
          <div className="divide-y divide-[#eef0f2]">
            {filteredReports.map((report) => (
              <div key={report.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Flag size={20} className="text-red-500" />
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
                          value={report.assignedModerator?.id || ""}
                          onChange={(e) => handleAssign(report.id, e.target.value)}
                          className="border border-[#d6dbe0] rounded-full px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a8c7a]/30"
                        >
                          <option value="">Unassigned</option>
                          {moderators.map((mod) => (
                            <option key={mod.id} value={mod.id}>
                              {mod.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        onClick={() => handleLoadReportMessages(report.id)}
                        className="flex items-center gap-2 text-sm text-[#1a8c7a] hover:text-[#136a5c]"
                      >
                        <ClipboardList size={16} /> View last 10 messages
                      </button>
                      <button
                        onClick={() => handleBan(report.reportedUser.email, report.reportedUser.id)}
                        className="flex items-center gap-2 text-sm text-red-600 hover:text-red-800"
                      >
                        <UserX size={16} /> Ban user
                      </button>
                    </div>
                  </div>
                  {report.status === "pending" && (
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


