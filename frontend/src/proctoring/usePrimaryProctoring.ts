import { useCallback, useEffect, useRef, useState } from 'react';
import type { ProctoringEventPayload, ProctoringEventType } from './proctoring.types';

type Options = {
  active: boolean;
  stream: MediaStream | null;
  onEvent: (event: ProctoringEventPayload) => void | Promise<void>;
};

export function usePrimaryProctoring({ active, stream, onEvent }: Options) {
  const [cameraAvailable, setCameraAvailable] = useState(false);
  const [microphoneAvailable, setMicrophoneAvailable] = useState(false);
  const onEventRef = useRef(onEvent);

  useEffect(() => { onEventRef.current = onEvent; }, [onEvent]);

  const report = useCallback((event_type: ProctoringEventType, description: string) => {
    void onEventRef.current({ event_type, timestamp: new Date().toISOString(), description });
  }, []);

  useEffect(() => {
    const videoTrack = stream?.getVideoTracks()[0] ?? null;
    const audioTrack = stream?.getAudioTracks()[0] ?? null;
    const syncStatus = () => {
      setCameraAvailable(Boolean(videoTrack && videoTrack.readyState === 'live' && videoTrack.enabled));
      setMicrophoneAvailable(Boolean(audioTrack && audioTrack.readyState === 'live' && audioTrack.enabled));
    };
    syncStatus();
    if (!stream) return;

    const onVideoEnded = () => {
      setCameraAvailable(false);
      if (active) report('CAMERA_INTERRUPTED', 'Primary camera track ended or was disconnected.');
    };
    const onAudioEnded = () => {
      setMicrophoneAvailable(false);
      if (active) report('MIC_INTERRUPTED', 'Primary microphone track ended or was disconnected.');
    };
    videoTrack?.addEventListener('ended', onVideoEnded);
    audioTrack?.addEventListener('ended', onAudioEnded);
    videoTrack?.addEventListener('mute', syncStatus);
    videoTrack?.addEventListener('unmute', syncStatus);
    audioTrack?.addEventListener('mute', syncStatus);
    audioTrack?.addEventListener('unmute', syncStatus);
    return () => {
      videoTrack?.removeEventListener('ended', onVideoEnded);
      audioTrack?.removeEventListener('ended', onAudioEnded);
      videoTrack?.removeEventListener('mute', syncStatus);
      videoTrack?.removeEventListener('unmute', syncStatus);
      audioTrack?.removeEventListener('mute', syncStatus);
      audioTrack?.removeEventListener('unmute', syncStatus);
    };
  }, [active, stream, report]);

  useEffect(() => {
    if (!active) return;
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        report('TAB_HIDDEN', 'Interview tab became hidden. This is a review event, not proof of misconduct.');
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [active, report]);

  return { cameraAvailable, microphoneAvailable };
}
