import { createClient } from "@/lib/supabase/server";

const typeIcons: Record<string, string> = { jpg: "🖼️", jpeg: "🖼️", png: "🖼️", pdf: "📄", zip: "🗂️" };

function iconFor(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return typeIcons[ext] ?? "📁";
}

function typeFor(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png"].includes(ext)) return "Photo";
  if (ext === "pdf") return "Flyer";
  if (ext === "zip") return "Brand assets";
  return "File";
}

const statusMeta: Record<string, { label: string; chip: string }> = {
  approved: { label: "Approved", chip: "success" },
  pending_review: { label: "Pending review", chip: "warning" },
  shared: { label: "Shared", chip: "neutral" },
};

export default async function Files() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("files")
    .select("id, name, status, created_at, clients(name)")
    .order("created_at", { ascending: false });

  const files = data ?? [];
  const clientName = (files[0]?.clients as unknown as { name: string } | null)?.name ?? "your client";

  return (
    <section>
      <div className="view-head files-head">
        <div>
          <h2>Files</h2>
          <p>Shared between Tandem and {clientName}.</p>
        </div>
        <button className="btn primary">+ Upload file</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>File</th><th>Type</th><th>Date</th><th>Status</th></tr>
          </thead>
          <tbody>
            {files.map((file) => (
              <tr key={file.id}>
                <td>
                  <div className="file-name">
                    <span className="file-icon">{iconFor(file.name)}</span> {file.name}
                  </div>
                </td>
                <td>{typeFor(file.name)}</td>
                <td>{new Date(file.created_at as string).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
                <td>
                  <span className={`chip ${statusMeta[file.status]?.chip ?? "neutral"}`}>
                    {statusMeta[file.status]?.label ?? file.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
