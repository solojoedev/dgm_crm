type TopbarProps = {
    title: string;
    mode: "agency" | "client";
};

export default function Topbar({ title, mode }: TopbarProps) {
    return (
        <header className="topbar">
            <div className="topbar-title">
                <h1>{title}</h1>
                <div className="breadcrumb">
                    {mode === "agency" ? "Across 4 active clients" : "Salt & Iron BBQ"}
                    {mode === "client" && <span className="client-pill">Viewing as client</span>}
                </div>
            </div>
            <div className="topbar-right">
                <input className="search" type="text" placeholder="Search content, files, people..."/>
                <button className="icon-btn" aria-label="Notifications">🔔</button>
                <div className="avatar">JM</div>
            </div>
        </header>
    )
}