import { useEffect, useState } from "react";
import {
  getLegalPolicies,
  updateLegalPolicies,
} from "../api/client";
import PageHeader from "../components/ui/PageHeader";
import Loading from "../components/ui/Loading";
import RichTextEditor, { htmlToPlainText } from "../components/RichTextEditor";

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

  if (loading) return <Loading message="Loading legal policies..." />;

  return (
    <div>
      <PageHeader
        title="Legal Policies"
        subtitle="Rich-text terms, privacy, and disclaimer shown in the mobile app"
      >
        <button
          type="button"
          className="btn btn-primary"
          onClick={saveAll}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save all"}
        </button>
      </PageHeader>

      {error ? <div className="alert alert-error">{error}</div> : null}

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Policy</th>
              <th>Description</th>
              <th>Preview</th>
              <th>Last updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {POLICY_ROWS.map((row) => {
              const plain = htmlToPlainText(policies[row.key]);
              const preview =
                plain.length > 120 ? `${plain.slice(0, 120)}…` : plain || "—";
              return (
                <tr key={row.key}>
                  <td>
                    <strong>{row.title}</strong>
                    <div className="cell-muted">{row.key}</div>
                  </td>
                  <td className="cell-muted">{row.description}</td>
                  <td style={{ maxWidth: 280 }}>{preview}</td>
                  <td>
                    {updatedAt[row.key]
                      ? new Date(updatedAt[row.key]).toLocaleString()
                      : "—"}
                  </td>
                  <td>
                    <div className="table-actions">
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => openEditor(row.key)}
                      >
                        Edit content
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editorOpen && editingMeta ? (
        <div className="modal-backdrop" onClick={closeEditor} role="presentation">
          <div
            className="modal-card modal-card-lg"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-header-row">
              <div>
                <h2 className="modal-title">{editingMeta.title}</h2>
                <p className="modal-subtitle">{editingMeta.description}</p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={closeEditor}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <RichTextEditor
              value={draftContent}
              onChange={setDraftContent}
              placeholder={`Write ${editingMeta.title}…`}
              minHeight={320}
            />

            <div className="modal-actions" style={{ marginTop: 20 }}>
              <button type="button" className="btn btn-secondary" onClick={closeEditor}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={saveDraft}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save policy"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
