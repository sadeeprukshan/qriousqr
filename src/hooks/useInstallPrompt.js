import { useEffect, useState } from 'react';

export function useInstallPrompt() {
  const [event, setEvent] = useState(null);

  useEffect(() => {
    function onBeforeInstall(e) {
      e.preventDefault();
      setEvent(e);
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  return {
    canInstall: !!event,
    prompt: async () => {
      if (!event) return null;
      event.prompt();
      const { outcome } = await event.userChoice;
      setEvent(null);
      return outcome; // 'accepted' | 'dismissed'
    }
  };
}
