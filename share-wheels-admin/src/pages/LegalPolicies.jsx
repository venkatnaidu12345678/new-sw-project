import { useEffect, useState } from "react";
import {
  getLegalPolicies,
  updateLegalPolicies,
} from "../api/client";
import PageHeader from "../components/ui/PageHeader";
import Loading from "../components/ui/Loading";
import RichTextEditor, { htmlToPlainText } from "../components/RichTextEditor";
import AdminPageShell, { AdminTablePanel } from "../components/ui/AdminPageShell";
import Pagination from "../components/ui/Pagination";
import { usePagination } from "../hooks/usePagination";
import IconActionButton from "../components/ui/IconActionButton";
import { IconFileEdit } from "../components/ui/icons";
import { Alert, btnClass, Table, Th, Td } from "../components/ui/primitives";

const POLICY_ROWS = [
  { key: "terms", title: "Terms of Service", description: "Shown when users accept terms" },
  { key: "privacy", title: "Privacy Policy", description: "Data collection and usage" },
  { key: "disclaimer", title: "Disclaimer", description: "Liability and service limits" },
];

export default function LegalPolicies() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [policies, setPolicies] = useState({
    terms: "",
    privacy: "",
    disclaimer: "",
  });

  const [updatedAt, setUpdatedAt] = useState({
    terms: null,
    privacy: null,
    disclaimer: null,
  });

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingKey, setEditingKey] = useState(null);
  const [draftContent, setDraftContent] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    return getLegalPolicies()
      .then((res) => {
        const p = res?.policies || {};
        setPolicies({
          terms: p.terms?.content || "",
          privacy: p.privacy?.content || "",
          disclaimer: p.disclaimer?.content || "",
        });
        setUpdatedAt({
          terms: p.terms?.updatedAt || null,
          privacy: p.privacy?.updatedAt || null,
          disclaimer: p.disclaimer?.updatedAt || null,
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const { page, setPage, paginatedItems, totalPages, totalItems, pageSize } = usePagination(POLICY_ROWS);

  const openEditor = (key) => {
    setEditingKey(key);
    setDraftContent(policies[key] || "");
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingKey(null);
    setDraftContent("");
  };

  const saveDraft = async () => {
    if (!editingKey) return;
    setSaving(true);
    setError("");
    try {
      const payload = { ...policies, [editingKey]: draftContent };
      await updateLegalPolicies(payload);
      await load();
      closeEditor();
      alert("Policy saved successfully.");
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const saveAll = async () => {
    setSaving(true);
    setError("");
    try {
      await updateLegalPolicies(policies);
      await load();
      alert("All legal policies saved successfully.");
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const editingMeta = POLICY_ROWS.find((r) => r.key === editingKey);

  return (
    <AdminPageShell>
      <PageHeader compact title="Legal Policies" subtitle="Rich-text terms, privacy, and disclaimer shown in the mobile app">
        <button type="button" className={btnClass("primary", "sm")} onClick={saveAll} disabled={saving}>
          {saving ? "Saving…" : "Save all"}
        </button>
      </PageHeader>

      {error ? <Alert className="mb-3 shrink-0">{error}</Alert> : null}

      <AdminTablePanel>
        {loading ? (
          <Loading message="Loading legal policies..." className="flex-1 py-8" />
        ) : (
          <>
            <Table fill>
              <thead>
                <tr>
                  <Th sticky>Policy</Th>
                  <Th sticky>Description</Th>
                  <Th sticky>Preview</Th>
                  <Th sticky>Last updated</Th>
                  <Th sticky>Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {paginatedItems.map((row) => {
                  const plain = htmlToPlainText(policies[row.key]);
                  const preview = plain.length > 120 ? `${plain.slice(0, 120)}…` : plain || "—";
                  return (
                    <tr key={row.key} className="hover:bg-slate-50/80">
                      <Td>
                        <div className="font-semibold text-slate-800">{row.title}</div>
                        <div className="text-xs text-slate-500">{row.key}</div>
                      </Td>
                      <Td className="text-slate-500">{row.description}</Td>
                      <Td className="max-w-xs text-sm text-slate-600">{preview}</Td>
                      <Td className="text-sm text-slate-500">
                        {updatedAt[row.key] ? new Date(updatedAt[row.key]).toLocaleString() : "—"}
                      </Td>
                      <Td>
                        <IconActionButton
                          icon={IconFileEdit}
                          label="Edit policy content"
                          variant="primary"
                          onClick={() => openEditor(row.key)}
                        />
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
            <Pagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
          </>
        )}
      </AdminTablePanel>

      {editorOpen && editingMeta ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={closeEditor} role="presentation">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl scrollbar-thin" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{editingMeta.title}</h2>
                <p className="text-sm text-slate-500">{editingMeta.description}</p>
              </div>
              <button type="button" className={btnClass("ghost", "sm")} onClick={closeEditor} aria-label="Close">
                Close
              </button>
            </div>
            <RichTextEditor
              value={draftContent}
              onChange={setDraftContent}
              placeholder={`Write ${editingMeta.title}…`}
              minHeight={320}
            />
            <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" className={btnClass("secondary")} onClick={closeEditor}>Cancel</button>
              <button type="button" className={btnClass("primary")} onClick={saveDraft} disabled={saving}>
                {saving ? "Saving…" : "Save policy"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AdminPageShell>
  );
}
