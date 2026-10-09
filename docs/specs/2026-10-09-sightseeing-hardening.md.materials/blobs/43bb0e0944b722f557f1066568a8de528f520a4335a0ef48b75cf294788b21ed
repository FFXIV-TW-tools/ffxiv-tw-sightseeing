import { progressSnapshotJson } from './ss_progress_data.js';

/** @typedef {{modal: (overlay: HTMLElement, options: {dialog: HTMLElement, initial: HTMLElement, onEscape: () => void}) => () => void, backdropClose: (overlay: HTMLElement, close: () => void) => () => void}} PortalA11y */

/**
 * @param {ReturnType<import('./ss_storage.js').createProgressStore>} store
 * @param {() => Promise<void>} refresh
 * @param {(message: string, tone?: string) => void} feedback
 */
export function createProgressUI(store, refresh, feedback) {
  const panel = document.querySelector('#ss-storage-status');
  if (!(panel instanceof HTMLElement)) throw new Error('完成紀錄狀態面板缺失');
  const message = panel.querySelector('[data-progress-message]');
  const backupButton = panel.querySelector('[data-progress-backup]');
  const saved = panel.querySelector('[data-progress-saved]');
  const savedLabel = panel.querySelector('[data-progress-saved-label]');
  const resetButton = panel.querySelector('[data-progress-reset]');
  if (!(backupButton instanceof HTMLButtonElement) || !(saved instanceof HTMLInputElement)
      || !(resetButton instanceof HTMLButtonElement) || !(savedLabel instanceof HTMLElement) || !message) {
    throw new Error('完成紀錄恢復控制項缺失');
  }
  /** @type {import('./ss_storage.js').ProgressSnapshot | null} */
  let current = null;
  /** @type {string | null} */
  let fingerprint = null;
  let working = false;
  let backupRequest = 0;

  const controls = () => {
    backupButton.hidden = !current || (current.kind === 'ready' && !current.legacyDrift);
    backupButton.disabled = working;
    savedLabel.hidden = !fingerprint || current?.kind !== 'corrupt';
    resetButton.hidden = current?.kind !== 'corrupt';
    resetButton.disabled = working || !fingerprint || !saved.checked;
    saved.disabled = working;
  };
  const invalidate = () => { fingerprint = null; saved.checked = false; backupRequest++; };

  /** @param {import('./ss_storage.js').ProgressSnapshot | null} snapshot @param {string} [error] */
  const render = (snapshot, error = '') => {
    current = snapshot;
    if (fingerprint) {
      try {
        if (!snapshot || progressSnapshotJson(snapshot.exists, snapshot.value, snapshot.legacyRaw) !== fingerprint) invalidate();
      } catch { invalidate(); }
    }
    panel.hidden = !snapshot ? !error : snapshot.kind === 'ready' && !snapshot.legacyDrift;
    message.textContent = error || (snapshot?.kind === 'corrupt'
      ? '完成紀錄損毀，原始資料保留且已停止寫入。請先下載完整原文備份；確認檔案保存後，才能重置完成紀錄。原因：' + snapshot.message
      : snapshot?.legacyDrift
        ? '舊版分頁另有修改：本頁仍以 IndexedDB 進度為準，不自動合併。請先下載兩份原文備份，關閉舊版分頁並重新整理。'
        : '正在讀取完成紀錄；讀取完成前不能勾選。');
    controls();
  };

  backupButton.addEventListener('click', async () => {
    const request = ++backupRequest;
    working = true;
    controls();
    try {
      const backup = await store.backup();
      if (request !== backupRequest) return;
      const url = URL.createObjectURL(new Blob([backup.json], { type: 'application/json;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'ffxiv-sightseeing-progress-backup.json';
      document.body.append(link);
      try { link.click(); } finally { link.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000); }
      fingerprint = backup.fingerprint;
      saved.checked = false;
      feedback('已開始下載原文備份；請確認檔案確實保存，再勾選確認。', 'ok');
    } catch (error) {
      invalidate();
      message.textContent = '無法完整備份，不允許重置；原始資料仍保留：' + (error instanceof Error ? error.message : String(error));
    } finally { working = false; controls(); }
  });
  saved.addEventListener('change', controls);
  panel.querySelector('[data-progress-refresh]')?.addEventListener('click', () => { void refresh(); });
  panel.querySelector('[data-progress-reload]')?.addEventListener('click', () => { window.location.reload(); });

  resetButton.addEventListener('click', () => {
    if (working || current?.kind !== 'corrupt' || !fingerprint || !saved.checked) return;
    const a11y = /** @type {Window & {FFXIVA11y?: PortalA11y}} */ (window).FFXIVA11y;
    if (typeof a11y?.modal !== 'function' || typeof a11y.backdropClose !== 'function') {
      feedback('共用介面已更新，請重新整理頁面');
      return;
    }
    const approvedFingerprint = fingerprint;
    const overlay = document.createElement('div');
    overlay.className = 'codex-modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'ss-progress-reset-title');
    overlay.innerHTML = '<div class="codex-modal">' +
      '<div class="codex-modal__header"><h3 class="codex-h3" id="ss-progress-reset-title">確認重置完成紀錄？</h3><button type="button" class="codex-modal__close" aria-label="取消重置">×</button></div>' +
      '<div class="codex-modal__body"><p>這會把此瀏覽器的探索筆記完成集合清空，所有新版分頁會一起更新。無法自動還原損毀的內容。</p><p>已下載備份及資料庫內最後一次原文備份保留；舊版原文與檢視偏好不會清除。若其他分頁已變更資料，重置將拒絕並要求重新備份。</p></div>' +
      '<div class="codex-modal__footer"><button type="button" class="codex-btn codex-btn--ghost" data-reset-cancel>取消</button><button type="button" class="codex-btn codex-btn--danger" data-reset-confirm>確認清空完成紀錄</button></div></div>';
    const cancel = overlay.querySelector('[data-reset-cancel]');
    const confirm = overlay.querySelector('[data-reset-confirm]');
    if (!(cancel instanceof HTMLButtonElement) || !(confirm instanceof HTMLButtonElement)) return;
    /** @type {(() => void) | null} */
    let release = null;
    /** @type {(() => void) | null} */
    let releaseBackdrop = null;
    const close = () => { overlay.remove(); releaseBackdrop?.(); release?.(); };
    cancel.addEventListener('click', close);
    overlay.querySelector('.codex-modal__close')?.addEventListener('click', close);
    confirm.addEventListener('click', async () => {
      if (!saved.checked || fingerprint !== approvedFingerprint || current?.kind !== 'corrupt') {
        close();
        feedback('未重置完成紀錄：備份確認已撤回或原始資料已變更，請重新備份。');
        return;
      }
      confirm.disabled = true;
      working = true;
      controls();
      try {
        await store.reset(approvedFingerprint);
        invalidate();
        close();
        feedback('完成紀錄已重置；原文備份與檢視偏好保留。', 'ok');
      } catch (error) {
        invalidate();
        close();
        feedback('未重置完成紀錄：' + (error instanceof Error ? error.message : String(error)));
      } finally { working = false; await refresh(); controls(); }
    });
    document.body.append(overlay);
    release = a11y.modal(overlay, { dialog: overlay, initial: cancel, onEscape: close });
    releaseBackdrop = a11y.backdropClose(overlay, close);
  });
  return { render };
}
