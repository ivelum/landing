const timeoutAfter = 15000;
const timeoutError = new Error('Crisp timed out');

// Resolves when Crisp has a session, not when its script has merely been
// asked for: a later click has to wait for a widget that can actually open.
let chatReady;

function loadChat() {
  chatReady ||= new Promise((resolve) => {
    window.$crisp = [];
    window.$crisp.push(['safe', true]);
    // Sentry instruments methods document.addEventListener() and
    // document.removeEventListener(), and Crisp complains about it. Disable
    // the warnings.
    $crisp.push(['on', 'session:loaded', resolve]);
    window.CRISP_WEBSITE_ID = '2aa7bcb2-8094-4624-b64e-112c2ca3a174';

    const script = document.createElement('script');
    script.src = 'https://client.crisp.chat/l.js';
    script.async = 1;
    document.getElementsByTagName('head')[0].appendChild(script);
  });
  return chatReady;
}

// Each click waits on its own clock, so a widget that turns up late is still
// usable on the next try.
function initChat() {
  return new Promise((resolve, reject) => {
    const timeoutID = setTimeout(() => reject(timeoutError), timeoutAfter);
    loadChat().then(() => {
      clearTimeout(timeoutID);
      resolve();
    });
  });
}

document.querySelectorAll('[data-chat-button]').forEach((button) => {
  const label = button.querySelector('[data-chat-button-label]');
  const loadingIndicator = button.querySelector('[data-chat-loading]');

  // Not every chat entry point has a separate label and loading indicator;
  // in compact ones the whole element is the trigger.
  const setLoading = (loading) => {
    button.disabled = loading;
    if (label) label.style.opacity = Number(!loading);
    if (loadingIndicator) {
      loadingIndicator.style.display = loading ? '' : 'none';
    }
  };

  button.addEventListener('click', async () => {
    window.posthog?.capture('live_chat_opened');
    setLoading(true);
    // Crisp takes a moment to answer. Closing the popup before it does leaves
    // the visitor looking at a bare page, which reads as a failure, so wait
    // here with the loader running and only then hand over.
    try {
      await initChat();
    } catch (error) {
      if (error !== timeoutError) throw error;
      // Timed out: stay where we are rather than close onto nothing.
      return;
    } finally {
      setLoading(false);
    }
    // A modal <dialog> owns the top layer and Crisp renders outside it, so the
    // widget would be stuck under the backdrop. Step out of the dialog first.
    button.closest('dialog[open]')?.close();
    window.$crisp.push(['do', 'chat:show']);
    window.$crisp.push(['do', 'chat:open']);
  });
});

document.querySelectorAll('[data-chat-status]').forEach((status) => {
    const startWorkHour = 10; // Start of working hours in Vilnius
    const endWorkHour = 20; // End of working hours in Vilnius

    const date = new Date();
    const utcDate = new Date(
      date.toLocaleString('en-US', { timeZone: 'UTC' }),
    );
    const vilDate = new Date(
      date.toLocaleString('en-US', { timeZone: 'Europe/Vilnius' }),
    );
    const vilOffset = (vilDate.getTime() - utcDate.getTime()) / 3600000;
    const localOffset = -new Date().getTimezoneOffset() / 60;

    const formatHours = (hourString) => {
      const hour = +hourString % 24;
      return (hour % 12 || 12) + (hour < 12 ? ' AM' : ' PM');
    };

    const getLocalDate = (hour) => {
      const dt = new Date();
      dt.setUTCHours(hour - vilOffset);
      dt.setMinutes(0);
      return new Date(dt.toLocaleString('en-US')).toString();
    };

    const localStart = getLocalDate(startWorkHour);
    const localEnd = getLocalDate(endWorkHour);

    const localTime = () => {
      if (vilOffset === localOffset) return 'matches your time zone';
      const start = formatHours(new Date(localStart).getHours());
      const end = formatHours(new Date(localEnd).getHours());
      return `(${start} – ${end} your time zone)`;
    };

    const isOnline = () => {
      const current = new Date();
      const start = new Date(localStart);
      const end = new Date(localEnd);
      return (start <= current && current < end);
    };

    const currentStatus = () => {
      return `Currently ${isOnline() ? 'online' : 'offline'}`;
    }

    // Compact chat blocks show the status without the local-time line.
    const localTimeElement = status.querySelector('[data-chat-local-time]');
    if (localTimeElement) localTimeElement.textContent = localTime();

    const currentStatusElement = status.querySelector(
      '[data-chat-current-status]',
    );
    if (currentStatusElement) {
      const online = isOnline();
      currentStatusElement.classList.add(
        online ? 'is-online' : 'is-offline',
      );
      currentStatusElement.textContent = currentStatus();
    }

    // Compact blocks replace the long "we're online from" sentence with the
    // working hours, or with the time we're back.
    const hoursElement = status.querySelector('[data-chat-hours]');
    if (hoursElement) {
      hoursElement.textContent = isOnline()
        ? `${formatHours(startWorkHour)} – ${formatHours(endWorkHour)} EET`
        : `back at ${formatHours(startWorkHour)} EET`;
    }
});
