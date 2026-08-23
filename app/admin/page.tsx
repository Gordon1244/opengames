import { SiteHeader, SiteFooter } from "../../components/SiteHeader";
import { getCurrentUser } from "../../lib/auth";
import { getOpenReports } from "../../lib/platform";
import ReportActions from "./ReportActions";
import { copy, getLocale } from "../../lib/i18n";
export const dynamic = "force-dynamic";
export default async function AdminPage() {
  const locale = await getLocale();
  const user = await getCurrentUser(); if (!user || user.role !== "admin") return <main><SiteHeader /><section className="login-gate"><span>ADMIN ONLY</span><h1>{copy(locale, "這個頁面需要管理員權限。", "This page requires administrator access.")}</h1><a href="/dashboard">{copy(locale, "返回控制台", "Back to dashboard")}</a></section><SiteFooter /></main>;
  const reports = await getOpenReports();
  return <main><SiteHeader /><section className="dashboard-head"><div><p className="eyebrow"><span /> TRUST & SAFETY</p><h1>{copy(locale, "檢舉中心", "Report center")}</h1><p>{copy(locale, "下架與結案皆經伺服器端重新驗證管理員權限。", "The server rechecks administrator access before takedowns or case closure.")}</p></div></section><section className="dashboard-list"><div className="list-heading"><h2>{copy(locale, "待處理檢舉", "Open reports")}</h2><span>{copy(locale, `${reports.length} 筆`, `${reports.length} reports`)}</span></div>{reports.map((report) => <article className="report-row" key={String(report.id)}><div><strong>{String(locale === "en" ? report.title_en || report.title_zh || report.slug || "Unknown game" : report.title_zh || report.slug || "未知作品")}</strong><span>{String(report.reason)}</span><p>{String(report.details || copy(locale, "未提供補充說明", "No additional details"))}</p></div><time>{String(report.created_at).slice(0, 16)}</time><ReportActions locale={locale} reportId={String(report.id)} gameId={String(report.game_id)} /></article>)}{!reports.length && <div className="empty-state"><strong>{copy(locale, "目前沒有待處理檢舉。", "There are no open reports.")}</strong><span>{copy(locale, "社群狀態良好。", "The community is in good shape.")}</span></div>}</section><SiteFooter /></main>;
}
