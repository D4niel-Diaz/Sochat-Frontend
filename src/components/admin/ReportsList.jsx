import { useEffect, useState } from "react";
import { adminService } from "../../api/services/adminService";
import { AlertTriangle, CheckCircle, Clock } from "lucide-react";
import toast from "react-hot-toast";
import { error as logError } from "../../utils/logger";

const ReportsList = () => {
  const [reports, setReports] = useState([]);
  const [filter, setFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, [filter]);

  const fetchReports = async () => {
    try {
      const response = await adminService.getReports(filter);

      const responseData = response.data.data || response.data;
      setReports(responseData || []);
    } catch (err) {
      logError("Failed to fetch reports:", err);
      toast.error("Failed to load reports");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolve = async (reportId) => {
    try {
      await adminService.resolveReport(reportId);
      toast.success("Report resolved");
      fetchReports();
    } catch (error) {
      toast.error(error.message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-base-content/60">
            {reports.length} report{reports.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="join">
          <button
            onClick={() => setFilter("all")}
            className={`btn btn-sm join-item ${
              filter === "all" ? "btn-active" : ""
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("pending")}
            className={`btn btn-sm join-item ${
              filter === "pending" ? "btn-active" : ""
            }`}
          >
            Pending
          </button>
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="bg-base-100 rounded-lg shadow-sm p-12 text-center">
          <AlertTriangle className="size-16 mx-auto mb-4 text-base-content/30" />
          <p className="text-base-content/60">No reports found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div
              key={report.report_id}
              className="bg-base-100 rounded-lg shadow-sm p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      report.status === "pending"
                        ? "bg-warning/10 text-warning"
                        : "bg-success/10 text-success"
                    }`}
                  >
                    {report.status === "pending" ? (
                      <AlertTriangle size={20} />
                    ) : (
                      <CheckCircle size={20} />
                    )}
                  </div>
                  <div>
                    <p className="font-mono text-sm">
                      Report #{report.report_id}
                    </p>
                    <p className="text-xs text-base-content/50">
                      Chat #{report.chat_id}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`badge ${
                      report.status === "pending"
                        ? "badge-warning"
                        : "badge-success"
                    }`}
                  >
                    {report.status}
                  </span>
                  {report.status === "pending" && (
                    <button
                      onClick={() => handleResolve(report.report_id)}
                      className="btn btn-sm btn-ghost"
                    >
                      <CheckCircle size={16} />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-base-content/60 mb-1">Reporter</p>
                  <p className="font-mono">
                    {report.reporter_guest_id?.substring(0, 8)}...
                  </p>
                </div>
                <div>
                  <p className="text-base-content/60 mb-1">Reported User</p>
                  <p className="font-mono">
                    {report.reported_guest_id?.substring(0, 8)}...
                  </p>
                </div>
                <div>
                  <p className="text-base-content/60 mb-1">Reason</p>
                  <p className="bg-base-200 p-3 rounded">{report.reason}</p>
                </div>
                <div className="flex items-center gap-2 text-base-content/50">
                  <Clock size={14} />
                  <span>{new Date(report.created_at).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReportsList;
