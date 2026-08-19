(() => {
  const QUEUE_KEY = '1884_ex_pending_v1';
  const SESSION_KEY = '1884_analytics_session_v1';

  function endpoint() {
    return String(window.EX_RECYCLING_CONFIG?.endpoint || '').trim();
  }

  function id() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return '1884-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function analyticsSessionId() {
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

  // Anonymous analytics. No name, IG account, phone number or login is collected.
  window.track1884 = function track1884(event, detail = '', page = '') {
    const eventName = String(event || '').trim();
    if (!eventName || !endpoint()) return;

    const payload = {
      type: 'analytics',
      sessionId: analyticsSessionId(),
      event: eventName,
      detail: typeof detail === 'string' ? detail : JSON.stringify(detail || ''),
      page: String(page || ''),
      clientTime: new Date().toISOString(),
      userAgent: navigator.userAgent
    };

    // Analytics must never block the guest experience.
    send(payload).catch(() => {});
  };

  function installAnalyticsHooks() {
    // Successful page load = QR/link landing view.
    window.track1884('page_view', '', 'home');

    // Screen opens in the main Web App.
    if (typeof window.go === 'function' && !window.go.__analyticsWrapped) {
      const originalGo = window.go;
      const trackedGo = function(id) {
        const map = {
          checkup: 'open_checkup',
          mission: 'open_mission',
          exbin: 'open_dear_ex'
        };
        if (map[id]) window.track1884(map[id], '', id);
        return originalGo.apply(this, arguments);
      };
      trackedGo.__analyticsWrapped = true;
      window.go = trackedGo;
    }

    if (typeof window.diagnose === 'function' && !window.diagnose.__analyticsWrapped) {
      const originalDiagnose = window.diagnose;
      const wrapped = function() {
        const hasStatus = !!document.querySelector('input[name="status"]:checked');
        const result = originalDiagnose.apply(this, arguments);
        if (hasStatus) {
          const status = document.querySelector('input[name="status"]:checked')?.value || '';
          const symptomCount = document.querySelectorAll('input[name="symptom"]:checked').length;
          window.track1884('complete_checkup', { status, symptomCount }, 'checkResult');
        }
        return result;
      };
      wrapped.__analyticsWrapped = true;
      window.diagnose = wrapped;
    }

    if (typeof window.shareStory === 'function' && !window.shareStory.__analyticsWrapped) {
      const originalShare = window.shareStory;
      const wrapped = function() {
        window.track1884('share_story', '', 'checkResult');
        return originalShare.apply(this, arguments);
      };
      wrapped.__analyticsWrapped = true;
      window.shareStory = wrapped;
    }

    if (typeof window.missionDone === 'function' && !window.missionDone.__analyticsWrapped) {
      const originalMissionDone = window.missionDone;
      const wrapped = function() {
        const missionText = String(document.getElementById('missionText')?.textContent || '').trim();
        const isRealMission = missionText && !missionText.includes('按下按鈕');
        const result = originalMissionDone.apply(this, arguments);
        if (isRealMission) window.track1884('mission_complete', missionText, 'mission');
        return result;
      };
      wrapped.__analyticsWrapped = true;
      window.missionDone = wrapped;
    }

    // Red Flag game lives on its own page, so record the outbound game launch here.
    document.addEventListener('click', (e) => {
      const el = e.target?.closest?.('[onclick*="pixel-cards"]');
      if (el) window.track1884('open_redflag', '', 'pixel-cards');
    }, { capture: true });
  }

  window.submitEx = async function submitEx() {
    const input = document.getElementById('exText');
    const text = String(input?.value || '').trim();
    if (!text) {
      toast('先寫下一句，再把它留在這裡');
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
      button.innerHTML = '送出中…<span class="english" style="color:#eadbd5">LEAVING IT HERE…</span>';
    }

    try {
      if (!endpoint()) {
        enqueue(payload);
        window.track1884?.('submit_ex', 'queued_no_endpoint', 'exbin');
        toast('已暫存在此裝置');
        return;
      }

      try {
        await send(payload);
      } catch (_) {
        enqueue(payload);
        window.track1884?.('submit_ex', 'queued_offline', 'exbin');
        toast('網路不穩 · 已暫存，連線後會自動送出');
        return;
      }

      window.track1884?.('submit_ex', '', 'exbin');
      input.value = '';
      const success = document.getElementById('exSuccess');
      if (success) success.style.display = 'block';
      toast('已留在這裡');
    } finally {
      if (button) {
        button.disabled = false;
        button.innerHTML = button.dataset.originalHtml || '留在這裡';
        delete button.dataset.originalHtml;
      }
    }
  };

  window.addEventListener('online', flushQueue);
  window.addEventListener('pageshow', flushQueue);
  setTimeout(flushQueue, 1000);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(installAnalyticsHooks, 0), { once: true });
  } else {
    setTimeout(installAnalyticsHooks, 0);
  }
})();
