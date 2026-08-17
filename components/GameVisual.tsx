export function GameVisual({ art, badge, index }: { art: string; badge?: string; index?: number }) {
  return <div className={`game-art ${art}`}><span className="card-index">{index ? String(index).padStart(2, "0") : "PLAY"}</span>{badge && <span className="card-badge">{badge}</span>}<div className="art-object" /><span className="card-play visual-play">▶</span></div>;
}
