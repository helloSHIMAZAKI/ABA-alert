import React, { useEffect, useState, useRef } from 'react';
import { ParsedDonation } from '../utils/abaParser';
import { playAlertChime } from '../utils/soundHelper';
import { speakKhmerTts } from '../utils/ttsHelper';

interface ObsOverlayProps {
  isStandalone?: boolean;
  previewDonation?: ParsedDonation | null;
  glowColor?: string;
  fontSize?: number; // base rem or px multiplier
  showSampleIfIdle?: boolean;
}

export const ObsOverlay: React.FC<ObsOverlayProps> = ({
  isStandalone = true,
  previewDonation = null,
  glowColor = '#00d68f',
  fontSize = 1,
  showSampleIfIdle = false,
}) => {
  const [currentAlert, setCurrentAlert] = useState<ParsedDonation | null>(null);
  const [isExiting, setIsExiting] = useState(false);
  const [queue, setQueue] = useState<ParsedDonation[]>([]);
  const isPlayingRef = useRef(false);

  // If external preview donation passed (e.g. from dashboard live preview)
  useEffect(() => {
    if (previewDonation) {
      setQueue((prev) => [...prev, previewDonation]);
    }
  }, [previewDonation]);

  // Connect to SSE stream
  useEffect(() => {
    const eventSource = new EventSource('/api/alerts/stream');

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'connected') {
          console.log('[OBS Overlay] Connected to alert stream:', data.clientId);
          return;
        }
        if (data.id && data.donorName) {
          setQueue((prev) => [...prev, data as ParsedDonation]);
        }
      } catch (e) {
        console.error('[OBS Overlay] Parse error:', e);
      }
    };

    eventSource.onerror = () => {
      console.warn('[OBS Overlay] Stream error, retrying...');
    };

    return () => {
      eventSource.close();
    };
  }, []);

  // Process alert queue
  useEffect(() => {
    if (isPlayingRef.current || queue.length === 0) return;

    isPlayingRef.current = true;
    const [nextAlert, ...remaining] = queue;
    setQueue(remaining);
    setCurrentAlert(nextAlert);
    setIsExiting(false);

    // Play chime sound
    playAlertChime(0.8);

    // Play Khmer TTS
    if (nextAlert.ttsScript) {
      speakKhmerTts(nextAlert.ttsScript, {
        volume: 1.0,
        rate: 0.95,
      }).catch((e) => console.warn('TTS playback issue:', e));
    }

    // Keep alert on screen for 7 seconds
    const displayDuration = 7000;
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, displayDuration - 500);

    const completeTimer = setTimeout(() => {
      setCurrentAlert(null);
      setIsExiting(false);
      isPlayingRef.current = false;
    }, displayDuration);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [queue]);

  const activeAlert = currentAlert || (showSampleIfIdle ? {
    id: 'sample_idle',
    donorName: 'zaion',
    amount: 1.00,
    formattedAmount: '$ 1.00',
    currency: 'USD' as const,
    remark: 'This is a test message from your viewer.',
    rawText: '',
    timestamp: Date.now(),
    ttsScript: 'អរគុណ មេ zaion បានឧបត្ថម្ភ 1 ដុល្លារ This is a test message from your viewer.',
  } : null);

  const containerClasses = isStandalone
    ? 'fixed inset-0 w-screen h-screen flex items-center justify-center pointer-events-none select-none bg-transparent overflow-hidden'
    : 'w-full h-full flex items-center justify-center select-none overflow-hidden';

  return (
    <div className={containerClasses}>
      {activeAlert && (
        <div
          className={`flex flex-col items-center justify-center text-center px-8 py-6 max-w-4xl transition-all duration-500 ${
            isExiting ? 'animate-alert-exit' : 'animate-alert-enter'
          }`}
          style={{ transform: `scale(${fontSize})` }}
        >
          {/* Top Line: [DonorName] [បានឧបត្ថម្ភ] [$ Amount] */}
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 font-bold text-5xl md:text-6xl tracking-normal text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
            <span className="text-white font-extrabold tracking-wide">
              {activeAlert.donorName}
            </span>
            <span className="text-white font-bold font-khmer">
              បានឧបត្ថម្ភ
            </span>
            <span
              className="font-black tracking-tight"
              style={{
                color: glowColor,
                textShadow: `0 0 18px ${glowColor}, 0 0 38px ${glowColor}80, 0 0 70px ${glowColor}40`,
              }}
            >
              {activeAlert.formattedAmount.startsWith('$') && !activeAlert.formattedAmount.startsWith('$ ')
                ? `$ ${activeAlert.formattedAmount.slice(1)}`
                : activeAlert.formattedAmount}
            </span>
          </div>

          {/* Bottom Line: [Remark] */}
          {activeAlert.remark && (
            <div className="mt-4 text-slate-100 font-semibold text-2xl md:text-3xl max-w-3xl leading-relaxed drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] break-words">
              {activeAlert.remark}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
