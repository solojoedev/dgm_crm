"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type FileRow = {
  id: string;
  name: string;
  status: string;
  created_at: string;
  url: string | null;
};

const typeIcons: Record<string, string> = { jpg: "🖼️", jpeg: "🖼️", png: "🖼️", pdf: "📄", zip: "🗂️" };

function isImage(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);
}

function iconFor(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return typeIcons[ext] ?? "📁";
}

function typeFor(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (isImage(name)) return "Photo";
  if (ext === "pdf") return "Flyer";
  if (ext === "zip") return "Brand assets";
  return "File";
}

const statusMeta: Record<string, { label: string; chip: string }> = {
  approved: { label: "Approved", chip: "success" },
  pending_review: { label: "Pending review", chip: "warning" },
  shared: { label: "Shared", chip: "neutral" },
};

type FilesProps = {
  mode: "agency" | "client";
  initialFiles: FileRow[];
  clientId: string | null;
  clientName: string;
};

export default function Files({ mode, initialFiles, clientId, clientName }: FilesProps) {
  const [files, setFiles] = useState(initialFiles);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!clientId) return;
    const supabase = createClient();

    async function poll() {
      const { data } = await supabase
        .from("files")
        .select("id, name, status, created_at, storage_path")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (!data) return;

      const paths = data.map((f) => f.storage_path);
      const { data: signedList } = paths.length
        ? await supabase.storage.from("files").createSignedUrls(paths, 3600)
        : { data: [] as { path: string | null; signedUrl: string }[] };
      const urlMap = new Map((signedList ?? []).map((s) => [s.path, s.signedUrl]));

      setFiles(
        data.map((f) => ({
          id: f.id,
          name: f.name,
          status: f.status,
          created_at: f.created_at,
          url: urlMap.get(f.storage_path) ?? null,
        }))
      );
    }

    const interval = setInterval(poll, 4000);
    return () => clearInterval(interval);
  }, [clientId]);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0 || !clientId) return;
    setUploading(true);
    const supabase = createClient();
    const newRows: FileRow[] = [];
    const status = mode === "client" ? "pending_review" : "shared";

    for (const file of Array.from(fileList)) {
      const path = `files/${clientId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("files").upload(path, file);
      if (uploadError) continue;

      const { data: inserted, error: insertError } = await supabase
        .from("files")
        .insert({ client_id: clientId, name: file.name, storage_path: path, status })
        .select()
        .single();
      if (insertError || !inserted) continue;

      const { data: signed } = await supabase.storage.from("files").createSignedUrl(path, 3600);
      newRows.push({ id: inserted.id, name: inserted.name, status: inserted.status, created_at: inserted.created_at, url: signed?.signedUrl ?? null });
    }

    setFiles((prev) => [...newRows, ...prev]);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleApprove(id: string) {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, status: "approved" } : f)));
    const supabase = createClient();
    await supabase.from("files").update({ status: "approved" }).eq("id", id);
  }

  return (
    <section>
      <div className="view-head files-head">
        <div>
          <h2>Files</h2>
          <p>Shared between Tandem and {clientName}.</p>
        </div>
        <input ref={fileInputRef} type="file" multiple style={{ display: "none" }} onChange={(e) => handleFiles(e.target.files)} />
        <button className="btn primary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          {uploading ? "Uploading…" : "+ Upload file"}
        </button>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th>File</th><th>Type</th><th>Date</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {files.map((file) => (
              <tr key={file.id}>
                <td>
                  <div className="file-name">
                    {isImage(file.name) && file.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={file.url} alt="" className="file-thumb" />
                    ) : (
                      <span className="file-icon">{iconFor(file.name)}</span>
                    )}
                    {file.url ? (
                      <a href={file.url} target="_blank" rel="noopener noreferrer">{file.name}</a>
                    ) : (
                      file.name
                    )}
                  </div>
                </td>
                <td>{typeFor(file.name)}</td>
                <td>{new Date(file.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
                <td>
                  <span className={`chip ${statusMeta[file.status]?.chip ?? "neutral"}`}>
                    {statusMeta[file.status]?.label ?? file.status}
                  </span>
                </td>
                <td>
                  {file.status === "pending_review" && (
                    <button className="btn primary" onClick={() => handleApprove(file.id)}>Approve</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
