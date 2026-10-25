
import { useEffect, useRef, useState } from 'react';

export function SecondaryCameraPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [message, setMessage] = useState('Connecting to interview...');
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function connectPhone() {
      const params = new URLSearchParams(window.location.search);
      const sessionId = params.get('session_id');
      const token = params.get('token');

      if (!sessionId || !token) {
        setMessage('Invalid pairing link. Please scan the QR code again.');
        return;
      }

      try {
        const response = await fetch(
           `/api/sessions/${encodeURIComponent(sessionId)}/secondary-camera/connect`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
          }
        );

        if (!response.ok) {
          throw new Error(`Pairing failed (${response.status}). Generate a new QR code.`);
        }

        if (cancelled) return;

        setConnected(true);
        setMessage('Paired successfully. Requesting camera permission...');

        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error(
            'Camera access requires a supported browser and a secure connection (HTTPS).'
          );
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setMessage(
          'Your phone camera is active. Currently, the video appears only on this phone.'
        );
      } catch (error) {
        if (!cancelled) {
          setMessage(
            error instanceof Error
              ? error.message
              : 'Unable to connect to the interview.'
          );
        }
      }
    }

    connectPhone();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 p-5 text-white">
      <div className="mx-auto max-w-xl space-y-4">
        <h1 className="text-2xl font-bold">HireNeuron Phone Camera</h1>

        <p className="rounded-lg bg-slate-800 p-3 text-sm">
          {message}
        </p>

        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full rounded-xl bg-black"
        />

        {connected && (
          <p className="text-sm text-green-400">
            Phone paired with the interview session.
          </p>
        )}

        <p className="text-xs text-slate-400">
          This is an optional secondary camera. Follow the interview's
          camera and recording consent instructions.
        </p>
      </div>
    </main>
  );
}
