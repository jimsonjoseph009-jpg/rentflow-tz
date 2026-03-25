const clients = new Map(); // key -> Set<res>

const getSet = (key) => {
  let set = clients.get(key);
  if (!set) {
    set = new Set();
    clients.set(key, set);
  }
  return set;
};

const safeWrite = (res, chunk) => {
  try {
    res.write(chunk);
    return true;
  } catch {
    return false;
  }
};

exports.registerChatClient = (key, res) => {
  const set = getSet(key);
  set.add(res);
};

exports.unregisterChatClient = (key, res) => {
  const set = clients.get(key);
  if (!set) return;
  set.delete(res);
  if (set.size === 0) clients.delete(key);
};

exports.broadcastChatEvent = (key, eventName, payload) => {
  const set = clients.get(key);
  if (!set || set.size === 0) return;

  const data = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const res of Array.from(set)) {
    const ok = safeWrite(res, data);
    if (!ok) {
      set.delete(res);
    }
  }

  if (set.size === 0) clients.delete(key);
};

