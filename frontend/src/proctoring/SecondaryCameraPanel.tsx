import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { PairingStatus, ProctoringEventPayload, SecondaryPairingInfo } from './proctoring.types';

type Props = {
  interviewId: string;
  apiBaseUrl: string;
  onEvent: (event: ProctoringEventPayload) => void | Promise<void>;
};

export function SecondaryCameraPanel({ interviewId, apiBaseUrl, onEvent }: Props) {
  const [status, setStatus] = useState<PairingStatus>('idle');
  const [pairing, setPairing] = useState<SecondaryPairingInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (pollRef.current !== null) window.clearInterval(pollRef.current);
  }, []);

  async function createPairing() {
    setError(null);
    setStatus('waiting');
    try {
      const response = await fetch(`${apiBaseUrl}/sessions/${encodeURIComponent(interviewId)}/secondary-camera/pair`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      });
      if (!response.ok) throw new Error(`Pairing request failed (${response.status}).`);
      const data = (await response.json()) as SecondaryPairingInfo;
      if (!data.pairing_url || !data.token || !data.expires_at) {
        throw new Error('Backend response is missing pairing_url, token or expires_at.');
      }
      setPairing(data);
      pollRef.current = window.setInterval(async () => {
        try {
          const check = await fetch(`${apiBaseUrl}/sessions/${encodeURIComponent(interviewId)}/secondary-camera/status`, { credentials: 'include' });
          if (!check.ok) return;
          const result = (await check.json()) as { status: PairingStatus };
          if (result.status === 'connected') {
            setStatus('connected');
            if (pollRef.current !== null) window.clearInterval(pollRef.current);
          } else if (result.status === 'disconnected' || result.status === 'error') {
            setStatus(result.status);
            if (pollRef.current !== null) window.clearInterval(pollRef.current);
            if (result.status === 'disconnected') {
              await onEvent({
                event_type: 'SECONDARY_CAMERA_DISCONNECTED',
                timestamp: new Date().toISOString(),
                description: 'Secondary camera service reported a disconnection.',
              });
            }
          }
        } catch {
          // A temporary network error is not proof of misconduct or a confirmed disconnect.
        }
      }, 2000);
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : 'Unable to create a pairing session.');
    }
  }

  async function disconnect() {
    if (pollRef.current !== null) window.clearInterval(pollRef.current);
    try {
      await fetch(`${apiBaseUrl}/sessions/${encodeURIComponent(interviewId)}/secondary-camera/pair`, {
        method: 'DELETE', credentials: 'include',
      });
    } finally {
      setPairing(null);
      setStatus('idle');
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
      <div>
        <h2 className="font-semibold text-slate-900">Optional smartphone camera</h2>
        <p className="text-sm text-slate-600">Pair a second device for an additional view. This is optional and is not a cheating verdict.</p>
      </div>
      {!pairing ? (
        <button type="button" onClick={createPairing} disabled={status === 'waiting'}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          {status === 'waiting' ? 'Creating secure pairing…' : 'Generate pairing QR'}
        </button>
      ) : (
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
          <div className="rounded-lg border bg-white p-2"><QRCodeSVG value={pairing.pairing_url} size={180} level="M" includeMargin /></div>
          <div className="min-w-0 space-y-2 text-sm">
            <p><strong>Status:</strong> {status}</p>
            <p><strong>Expires:</strong> {new Date(pairing.expires_at).toLocaleTimeString()}</p>
            <p className="text-slate-600">Scan with your smartphone and follow the consent and camera prompts.</p>
            <button type="button" onClick={disconnect} className="rounded-lg border px-3 py-1.5">End pairing</button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {status === 'connected' && <p className="text-sm text-green-700">The backend reports a connected secondary device.</p>}
      {status === 'waiting' && pairing && <p className="text-xs text-slate-500">Waiting for the phone. QR display alone does not mean video is streaming.</p>}
    </section>
  );
}
