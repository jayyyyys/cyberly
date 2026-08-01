import { useState } from "react";
import { useTranslation } from "react-i18next";
import { adminLocaleLabel } from "./AdminTranslationTabs";

function reasonLabel(t, reason) {
  const code = typeof reason === "string" ? reason : reason?.code;
  return t(`admin.publication.reasons.${code}`, { defaultValue: code || t("admin.publication.reasons.unknown") });
}

export default function AdminPublicationControl({
  itemType,
  status = "draft",
  readiness,
  onPublish,
  onReturnToDraft,
  busy = false,
}) {
  const { t } = useTranslation();
  const [pendingAction, setPendingAction] = useState(null);
  const ready = Boolean(readiness?.ready);
  const archived = status === "archived";
  const optionalMissing = readiness?.optionalMissing || [];
  const publishLabel = itemType === "scenario" ? t("admin.publication.publishScenario") : t("admin.publication.publishResource");
  const returnLabel = t("admin.publication.returnToDraft");

  const confirmAction = async () => {
    const action = pendingAction;
    setPendingAction(null);
    if (action === "publish") await onPublish?.();
    if (action === "unpublish") await onReturnToDraft?.();
  };

  return (
    <section className="admin-publication-control" aria-label={t("admin.publication.label")}>
      <div className="admin-publication-control-head">
        <div>
          <p className="res-tag">{t("admin.publication.label")}</p>
          <h3>{t(`admin.publication.status.${status}`, { defaultValue: status })}</h3>
        </div>
        <span className={ready ? "admin-status-badge publication-published" : "admin-status-badge publication-draft"}>
          {ready ? t("admin.publication.ready") : t("admin.publication.cannotPublish")}
        </span>
      </div>

      {!ready && (
        <div className="admin-publication-reasons">
          <strong>{t("admin.publication.missing")}</strong>
          <ul>
            {(readiness?.reasons || []).map(reason => (
              <li key={typeof reason === "string" ? reason : reason.code}>{reasonLabel(t, reason)}</li>
            ))}
          </ul>
        </div>
      )}

      {optionalMissing.length > 0 && (
        <p className="admin-publication-warning">
          {t("admin.publication.optionalLocaleWarning", {
            locales: optionalMissing.map(locale => adminLocaleLabel(t, locale)).join(", "),
          })}
        </p>
      )}

      <div className="admin-publication-actions">
        {status === "draft" && (
          <button type="button" className="btn-primary" disabled={!ready || busy || archived} onClick={() => setPendingAction("publish")}>
            {publishLabel}
          </button>
        )}
        {status === "published" && (
          <button type="button" className="btn-secondary" disabled={busy} onClick={() => setPendingAction("unpublish")}>
            {returnLabel}
          </button>
        )}
        {status === "archived" && (
          <span className="admin-lifecycle-helper">{t("admin.publication.restoreInLifecycle")}</span>
        )}
      </div>

      {pendingAction && (
        <div className="admin-confirm-backdrop" role="presentation">
          <div className="admin-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-publication-confirm-title">
            <h3 id="admin-publication-confirm-title">
              {pendingAction === "publish" ? publishLabel : returnLabel}
            </h3>
            {pendingAction === "publish" ? (
              <p>
                {itemType === "scenario"
                  ? t("admin.publication.confirmPublishScenario")
                  : t("admin.publication.confirmPublishResource")}
              </p>
            ) : (
              <p>{t("admin.publication.confirmReturnToDraft")}</p>
            )}
            {pendingAction === "publish" && optionalMissing.length > 0 && (
              <p className="admin-publication-warning">
                {t("admin.publication.confirmOptionalFallback", {
                  locales: optionalMissing.map(locale => adminLocaleLabel(t, locale)).join(", "),
                })}
              </p>
            )}
            <div className="admin-confirm-actions">
              <button type="button" className="btn-secondary" onClick={() => setPendingAction(null)}>
                {t("common.cancel")}
              </button>
              <button type="button" className="btn-primary" onClick={confirmAction}>
                {pendingAction === "publish" && optionalMissing.length > 0
                  ? t("admin.publication.publishWithFallback")
                  : pendingAction === "publish"
                    ? publishLabel
                    : returnLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
