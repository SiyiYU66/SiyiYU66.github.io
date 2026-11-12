// One reusable parent-document confirmation. It never navigates or disconnects
// a room itself: the caller performs the action only after a true result.
let nextDialogId = 0;

export function createActionConfirmation({document = globalThis.document} = {}) {
  const root = document.createElement('div');
  const panel = document.createElement('section');
  const title = document.createElement('h2');
  const message = document.createElement('p');
  const actions = document.createElement('div');
  const stay = document.createElement('button');
  const approve = document.createElement('button');
  const id = `action-confirm-${++nextDialogId}`;
  root.className = 'action-confirm';
  root.hidden = true;
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-labelledby', `${id}-title`);
  root.setAttribute('aria-describedby', `${id}-message`);
  panel.className = 'action-confirm-panel';
  title.className = 'action-confirm-title';
  title.id = `${id}-title`;
  message.className = 'action-confirm-message';
  message.id = `${id}-message`;
  actions.className = 'action-confirm-actions';
  stay.className = 'action-confirm-cancel';
  approve.className = 'action-confirm-approve';
  stay.type = approve.type = 'button';
  stay.textContent = 'Keep playing';
  actions.append(stay, approve);
  panel.append(title, message, actions);
  root.append(panel);
  document.body.append(root);

  let resolvePending = null;
  let previousFocus = null;
  let destroyed = false;
  const focus = element => {
    try { element?.focus({preventScroll:true}); } catch {}
  };
  const finish = answer => {
    if (!resolvePending) return;
    const resolve = resolvePending;
    resolvePending = null;
    root.hidden = true;
    const restore = previousFocus;
    previousFocus = null;
    if (restore?.isConnected !== false) focus(restore);
    resolve(answer);
  };
  const keydown = event => {
    if (!resolvePending) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      finish(false);
    } else if (event.key === 'Tab') {
      const active = document.activeElement;
      if (event.shiftKey ? active !== approve : active !== stay) {
        event.preventDefault();
        focus(event.shiftKey ? approve : stay);
      }
    }
  };
  const focusin = event => {
    if (resolvePending && !root.contains(event.target)) focus(stay);
  };
  stay.addEventListener('click', () => finish(false));
  approve.addEventListener('click', () => finish(true));
  document.addEventListener('keydown', keydown, true);
  document.addEventListener('focusin', focusin, true);

  return {
    request({title: heading, message: detail, confirmLabel = 'Leave game'} = {}) {
      // A second tap must not queue another dialog or obtain another approval.
      if (destroyed || resolvePending) return Promise.resolve(false);
      title.textContent = heading || 'Leave this game?';
      message.textContent = detail || '';
      approve.textContent = confirmLabel;
      previousFocus = document.activeElement;
      const result = new Promise(resolve => { resolvePending = resolve; });
      root.hidden = false;
      focus(stay);
      return result;
    },
    isOpen() { return Boolean(resolvePending); },
    cancel() { finish(false); },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      finish(false);
      document.removeEventListener('keydown', keydown, true);
      document.removeEventListener('focusin', focusin, true);
      root.remove();
    }
  };
}
