(() => {
  const SESSION_KEY = '1884_analytics_session_v1';
  let completedSent = false;

  function endpoint() {
    return String(window.EX_RECYCLING_CONFIG?.endpoint || '').trim();
  }

  function id() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return '1884-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function sessionId() {
    try {
      let value = localStorage.getItem(SESSION_KEY);
      if (!value) {
        value = id();
        localStorage.setItem(SESSION_KEY, value);
      }
      return value;
    } catch (_) {
      return id();
    }
  }

  function track(event, detail = '') {
    const url = endpoint();
    if (!url) return;
    fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      cache: 'no-store',
      keepalive: true,
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify({
        type: 'analytics',
        sessionId: sessionId(),
        event,
        detail,
        page: 'pixel-cards',
        clientTime: new Date().toISOString(),
        userAgent: navigator.userAgent
      })
    }).catch(() => {});
  }

  function watchEnd() {
    const end = document.getElementById('end');
    if (!end) return;

    const check = () => {
      const visible = !end.classList.contains('hidden');
      if (visible && !completedSent) {
        completedSent = true;
        track('complete_redflag', '15_cards');
      }
      if (!visible) completedSent = false;
    };

    new MutationObserver(check).observe(end, { attributes: true, attributeFilter: ['class', 'style'] });
    check();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', watchEnd, { once: true });
  } else {
    watchEnd();
  }
})();
