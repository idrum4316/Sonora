import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ROW_HEIGHT, closeDialog, runDialogRow, useNav, type Dialog } from '../nav';
import { Pane } from './Pane';
import { VirtualList } from './VirtualList';

const MAX_PICK_ROWS = 12;

const CancelButton = () => (
  <button type="button" tabIndex={-1} className="t-link" onClick={closeDialog}><kbd>esc</kbd> cancel</button>
);

function PickBody({ dialog }: { dialog: Extract<Dialog, { kind: 'pick' }> }) {
  const { pane, title } = dialog;
  const rows = Math.min(Math.max(pane.items.length + (pane.error ? 1 : 0), 1), MAX_PICK_ROWS);
  return (
    <>
      <div className="t-dialog-list" style={{ height: rows * ROW_HEIGHT }}>
        <VirtualList
          id="dialog"
          label={title}
          pane={pane}
          focused
          emptyText=""
          onSelect={runDialogRow}
          onActivate={runDialogRow}
        />
      </div>
      <div className="t-dialog-actions">
        <CancelButton />
      </div>
    </>
  );
}

function PromptBody({ dialog }: { dialog: Extract<Dialog, { kind: 'prompt' }> }) {
  const [value, setValue] = useState('');
  const name = value.trim();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (name) dialog.onSubmit(name);
  }

  return (
    <form className="t-dialog-form" onSubmit={handleSubmit}>
      <label className="t-field">
        <span>{dialog.label}</span>
        <input
          value={value}
          onChange={e => setValue(e.target.value)}
          maxLength={120}
          spellCheck={false}
          autoComplete="off"
          autoFocus
        />
      </label>
      <div className="t-dialog-actions">
        <CancelButton />
        <button type="submit" tabIndex={-1} className="t-button" disabled={!name}><kbd>enter</kbd> {dialog.submitLabel}</button>
      </div>
    </form>
  );
}

function ConfirmBody({ dialog }: { dialog: Extract<Dialog, { kind: 'confirm' }> }) {
  return (
    <>
      <p className="t-dialog-message">{dialog.message}</p>
      <div className="t-dialog-actions">
        <CancelButton />
        <button type="button" tabIndex={-1} className="t-button" onClick={dialog.onConfirm}><kbd>y</kbd> {dialog.confirmLabel}</button>
      </div>
    </>
  );
}

/**
 * The open dialog. Keys are handled in useKeymap with everything else, and each button shows its
 * key, so the buttons stay out of the tab order and exist for the mouse.
 */
export function DialogOverlay({ dialog }: { dialog: Dialog }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const opener = useRef(document.activeElement as HTMLElement | null);

  // Hand focus back to whatever had it, so the list keeps announcing its active row.
  useEffect(() => {
    const element = opener.current;
    return () => {
      // StrictMode also runs this cleanup right after mounting, while the dialog is still open.
      if (!useNav.getState().dialog) element?.focus({ preventScroll: true });
    };
  }, []);

  // Pick and prompt focus their own list or input. A confirm has neither, so it takes focus itself.
  useEffect(() => {
    if (dialog.kind === 'confirm') panelRef.current?.focus();
  }, [dialog.kind]);

  return (
    <div
      ref={panelRef}
      className="t-overlay"
      role={dialog.kind === 'confirm' ? 'alertdialog' : 'dialog'}
      aria-modal="true"
      aria-label={dialog.title}
      tabIndex={-1}
      onMouseDown={e => { if (e.target === e.currentTarget) closeDialog(); }}
    >
      <Pane title={dialog.title} focused className="t-dialog">
        {dialog.kind === 'pick' && <PickBody dialog={dialog} />}
        {dialog.kind === 'prompt' && <PromptBody dialog={dialog} />}
        {dialog.kind === 'confirm' && <ConfirmBody dialog={dialog} />}
      </Pane>
    </div>
  );
}
