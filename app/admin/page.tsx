import { SiteHeader, SiteFooter } from "../../components/SiteHeader";
import { getCurrentUser } from "../../lib/auth";
import { getOpenReports } from "../../lib/platform";
import ReportActions from "./ReportActions";
export const dynamic = "force-dynamic";
export default async function AdminPage() {
  const user = await getCurrentUser(); if (!user || user.role !== "admin") return <main><SiteHeader /><section className="login-gate"><span>ADMIN ONLY</span><h1>這個頁面需要管理員權限。</h1><a href="/dashboard">返回控制台</a></section><SiteFooter /></main>;
  const reports = await getOpenReports();
  return <main><SiteHeader /><section className="dashboard-head"><div><p className="eyebrow"><span /> TRUST & SAFETY</p><h1>檢舉中心</h1><p>下架與結案皆經伺服器端重新驗證管理員權限。</p></div></section><section className="dashboard-list"><div className="list-heading"><h2>待處理檢舉</h2><span>{reports.length} 筆</span></div>{reports.map((report) => <article className="report-row" key={String(report.id)}><div><strong>{String(report.title_zh || report.slug || "未知作品")}</strong><span>{String(report.reason)}</span><p>{String(report.details || "未提供補充說明")}</p></div><time>{String(report.created_at).slice(0, 16)}</time><ReportActions reportId={String(report.id)} gameId={String(report.game_id)} /></article>)}{!reports.length && <div className="empty-state"><strong>目前沒有待處理檢舉。</strong><span>社群狀態良好。</span></div>}</section><SiteFooter /></main>;
}
