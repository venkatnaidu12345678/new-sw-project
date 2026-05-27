import { useEffect, useState } from "react";
import {
  getLegalPolicies,
  updateLegalPolicies,
} from "../api/client";
import PageHeader from "../components/ui/PageHeader";
import Loading from "../components/ui/Loading";

const POLICY_LABELS = [
  { key: "terms", title: "Terms of Service" },
  { key: "privacy", title: "Privacy Policy" },
  { key: "disclaimer", title: "Disclaimer" },
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

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await updateLegalPolicies(policies);
      await load();
      alert("Legal policies saved successfully.");
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading message="Loading legal policies..." />;

  return (
    <div>
      <PageHeader
        title="Legal Policies"
        subtitle="Admin-editable Terms / Privacy / Disclaimer text (shown in the mobile app)"
      />

      {error ? <div className="alert alert-error">{error}</div> : null}

      <div className="card card-padded" style={{ marginBottom: 20 }}>
        {POLICY_LABELS.map((p) => (
          <div key={p.key} className="form-field" style={{ marginBottom: 18 }}>
            <label>{p.title}</label>
            <textarea
              value={policies[p.key] || ""}
              onChange={(e) =>
                setPolicies((prev) => ({ ...prev, [p.key]: e.target.value }))
              }
              rows={10}
              placeholder={`Enter ${p.title} here...`}
            />
            {updatedAt[p.key] ? (
              <div style={{ fontSize: 12, color: "#64748B", marginTop: 6 }}>
                Last updated: {new Date(updatedAt[p.key]).toLocaleString()}
              </div>
            ) : null}
          </div>
        ))}

        <div className="form-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save all"}
          </button>
        </div>
      </div>
    </div>
  );
}

