import { SiteHeader, SiteFooter } from "../../components/SiteHeader";
import { getCurrentUser } from "../../lib/auth";
import { getCreatorGames } from "../../lib/platform";
import GameActions from "./GameActions";

export const dynamic = "force-dynamic";
export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return <main><SiteHeader /><section className="login-gate dashboard-gate"><span>CREATOR DASHBOARD</span><h1>登入後查看你的作品。</h1><a className="primary-button" href="/login?next=/dashboard">登入 <span>↗</span></a></section><SiteFooter /></main>;
  const games = await getCreatorGames(user.id);
  const totalPlays = games.reduce((sum, game) => sum + Number(game.plays || 0), 0);
  return <main><SiteHeader /><section className="dashboard-head"><div><p className="eyebrow"><span /> CREATOR DASHBOARD</p><h1>作品控制台</h1><p>{user.email}</p></div><div className="dashboard-actions"><a className="primary-button" href="/upload">發布新遊戲 <span>↗</span></a><form action="/auth/signout" method="post"><button>登出</button></form></div></section><section className="dashboard-stats"><div><strong>{games.length}</strong><span>作品</span></div><div><strong>{games.filter((game) => game.status === "published").length}</strong><span>公開中</span></div><div><strong>{totalPlays.toLocaleString()}</strong><span>累積遊玩</span></div></section><section className="dashboard-list"><div className="list-heading"><h2>你的作品</h2><span>最新更新</span></div>{games.length ? games.map((game) => <article key={String(game.id)} className="dashboard-row"><a className="mini-cover" href={`/games/${String(game.slug)}`}>O</a><div><a href={`/games/${String(game.slug)}`}><strong>{String(game.title_zh)}</strong></a><span>版本 {String(game.version || "1.0.0")} · {Number(game.plays || 0).toLocaleString()} 次遊玩</span></div><span className={`status-pill ${String(game.status)}`}>{String(game.release_status || game.status)}</span><time>{String(game.updated_at).slice(0, 10)}</time><GameActions gameId={String(game.id)} initialStatus={String(game.status)} initialAllowDownload={Boolean(game.allow_download)} /></article>) : <div className="empty-state"><strong>還沒有作品。</strong><span>發布第一款 HTML5 遊戲，幾分鐘內就能分享。</span><a href="/upload">開始上傳 ↗</a></div>}</section>{user.role === "admin" && <a className="admin-shortcut" href="/admin">前往管理與檢舉中心 →</a>}<SiteFooter /></main>;
}
