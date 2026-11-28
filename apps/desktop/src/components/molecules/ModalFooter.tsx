export function ModalFooter({
  submitLabel,
  canSubmit,
  onClose,
}: {
  submitLabel: string;
  canSubmit: boolean;
  onClose: () => void;
}) {
  return (
    <footer className="modal__footer">
      <button type="button" className="button" onClick={onClose}>
        キャンセル
      </button>
      <button type="submit" className="button button--primary" disabled={!canSubmit}>
        {submitLabel}
        <kbd>⌘↵</kbd>
      </button>
    </footer>
  );
}
