(() => {
  const QUEUE_KEY = '1884_ex_pending_v1';

  function endpoint() {
    return String(window.EX_RECYCLING_CONFIG?.endpoint || '').trim();
  }

  function id() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return '1884-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function readQueue() {
    try {
      const value = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch (_) {
      return [];
    }
  }

  function writeQueue(items) {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(items.slice(-100)));
    } catch (_) {}
  }

  function enqueue(payload) {
    const queue = readQueue();
    if (!queue.some(item => item.submissionId === payload.submissionId)) queue.push(payload);
    writeQueue(queue);
  }

  async function send(payload) {
    const url = endpoint();
    if (!url) throw new Error('ENDPOINT_NOT_CONFIGURED');

    // no-cors avoids a browser preflight against Google Apps Script while still
    // allowing the anonymous POST to reach the deployed Web App.
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      cache: 'no-store',
      keepalive: true,
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify(payload)
    });
  }

  async function flushQueue() {
    if (!endpoint() || !navigator.onLine) return;
    const queue = readQueue();
    if (!queue.length) return;

    const remaining = [];
    for (const payload of queue) {
      try {
        await send(payload);
      } catch (_) {
        remaining.push(payload);
      }
    }
    writeQueue(remaining);
  }

  window.submitEx = async function submitEx() {
    const input = document.getElementById('exText');
    const text = String(input?.value || '').trim();
    if (!text) {
      toast('先寫下一句，再把它丟掉');
      return;
    }

    const payload = {
      text,
      submissionId: id(),
      clientTime: new Date().toISOString(),
      userAgent: navigator.userAgent
    };

    const button = document.querySelector('#exbin button.primary, button[onclick="submitEx()"]');
    if (button) {
      button.disabled = true;
      button.dataset.originalHtml = button.innerHTML;
      button.innerHTML = '回收中…<span class="english" style="color:#eadbd5">RECYCLING…</span>';
    }

    try {
      if (!endpoint()) {
        enqueue(payload);
        toast('雲端投稿尚未設定 · 已暫存在此裝置');
        return;
      }

      try {
        await send(payload);
      } catch (_) {
        enqueue(payload);
        toast('網路不穩 · 已暫存，連線後會自動送出');
        return;
      }

      input.value = '';
      const success = document.getElementById('exSuccess');
      if (success) success.style.display = 'block';
      toast('回收完成 · SUCCESSFULLY RECYCLED');
    } finally {
      if (button) {
        button.disabled = false;
        button.innerHTML = button.dataset.originalHtml || '丟掉它 →';
        delete button.dataset.originalHtml;
      }
    }
  };

  window.addEventListener('online', flushQueue);
  window.addEventListener('pageshow', flushQueue);
  setTimeout(flushQueue, 1000);
})();
