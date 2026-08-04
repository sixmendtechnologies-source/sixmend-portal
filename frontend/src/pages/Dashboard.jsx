import { useEffect, useState } from "react";
import api from "../utils/api";
import HealthCard from "../components/dashboard/HealthCard";
import TasksCard from "../components/dashboard/TasksCard";
import ProgressCard from "../components/dashboard/ProgressCard";
import TimeCard from "../components/dashboard/TimeCard";
import CostCard from "../components/dashboard/CostCard";
import WorkloadCard from "../components/dashboard/WorkloadCard";
import { C } from "../utils/colors";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/dashboard/stats")
      .then((res) => setStats(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div
          className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{ borderColor: C.green, borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <HealthCard stats={stats} />
      <TasksCard stats={stats} />
      <ProgressCard stats={stats} />
      <TimeCard stats={stats} />
      <CostCard stats={stats} />
      <WorkloadCard stats={stats} />
    </div>
  );
}
