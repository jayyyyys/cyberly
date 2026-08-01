import { useTranslation } from "react-i18next";
import { ResourceLifecycleIconButton } from "./AdminResourceActions";

export default function AdminQuickReviewActions({
  editLabelKey = "common.edit",
  lifecycleLabelKey,
  onEdit,
  onLifecycle,
}) {
  const { t } = useTranslation();
  return (
    <div className="admin-quick-review-actions">
      <button type="button" className="btn-primary admin-quick-review-edit" onClick={onEdit}>
        {t(editLabelKey)}
      </button>
      <ResourceLifecycleIconButton
        className="admin-quick-review-lifecycle"
        labelKey={lifecycleLabelKey}
        onClick={onLifecycle}
      />
    </div>
  );
}
