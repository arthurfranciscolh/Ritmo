export const RETENTION = 15 * 24 * 60 * 60 * 1000;

export function pruneTrash(state, now = Date.now()) {
  const before = state.trash || [];
  state.trash = before.filter(item => now < item.deletedAt + RETENTION);
  return before.length !== state.trash.length;
}

function archive(state, kind, folder, sessions, now) {
  pruneTrash(state, now);
  state.trash.push({id: crypto.randomUUID(), kind, deletedAt: now,
    folder: structuredClone(folder), sessions: structuredClone(sessions)});
}

export function deleteRecord(state, id, now = Date.now()) {
  const record = state.sessions.find(s => s.id === id);
  if (!record) return false;
  const folder = state.folders.find(f => f.id === record.folderId);
  archive(state, 'record', folder, [record], now);
  state.sessions = state.sessions.filter(s => s.id !== id);
  return true;
}

export function deleteGroup(state, id, now = Date.now()) {
  const folder = state.folders.find(f => f.id === id);
  if (!folder || state.active?.folderId === id) return false;
  archive(state, 'group', folder, state.sessions.filter(s => s.folderId === id), now);
  state.folders = state.folders.filter(f => f.id !== id);
  state.sessions = state.sessions.filter(s => s.folderId !== id);
  if (state.selected === id) state.selected = null;
  return true;
}

export function restoreItem(state, id, now = Date.now()) {
  pruneTrash(state, now);
  const item = state.trash.find(t => t.id === id);
  if (!item) return false;
  if (!state.folders.some(f => f.id === item.folder.id)) {
    const restored = structuredClone(item.folder);
    let suffix = 1;
    while (state.folders.some(f => f.name.toLocaleLowerCase() === restored.name.toLocaleLowerCase())) {
      restored.name = `${item.folder.name} (restaurada${suffix > 1 ? ` ${suffix}` : ''})`;
      suffix++;
    }
    state.folders.push(restored);
  }
  for (const record of item.sessions) {
    if (!state.sessions.some(s => s.id === record.id)) state.sessions.push(structuredClone(record));
  }
  state.trash = state.trash.filter(t => t.id !== id);
  return true;
}
