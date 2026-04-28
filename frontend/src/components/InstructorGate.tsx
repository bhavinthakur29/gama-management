import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import { api } from '../api/axios';
import { useAuth, type InstructorSession } from '../context/AuthContext';

const keypadItems = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'Clear', '0'];

// --- Helpers ---
function playSuccessChime() {
  const AudioContextClass =
    window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextClass) return;

  const audioContext = new AudioContextClass();
  const gain = audioContext.createGain();
  const firstTone = audioContext.createOscillator();
  const secondTone = audioContext.createOscillator();
  const now = audioContext.currentTime;

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);
  gain.connect(audioContext.destination);

  firstTone.frequency.setValueAtTime(523.25, now);
  secondTone.frequency.setValueAtTime(659.25, now + 0.08);
  firstTone.connect(gain);
  secondTone.connect(gain);
  firstTone.start(now);
  secondTone.start(now + 0.08);
  firstTone.stop(now + 0.22);
  secondTone.stop(now + 0.34);
}

function withFallbackExpiry(session: InstructorSession) {
  return {
    ...session,
    expires_at: session.expires_at ?? new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
  };
}

// --- Main Component ---
export function InstructorGate() {
  const { branchId, instructor, isInitialized, isInstructorActive, setInstructor, user } = useAuth();
  const navigate = useNavigate();

  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const shakeControls = useAnimationControls();

  // 1. Immediate Bypass Logic (No flickering!)
  const role = user?.role?.toLowerCase().replace('-', '_');
  const isMasterAdmin = role === 'super_admin' || role === 'admin';
  const shouldHideGate = !isInitialized || isMasterAdmin || (isInstructorActive && !isExiting);

  // 2. Fallback Redirect (If a non-admin sneaks in without a branch session)
  useEffect(() => {
    if (isInitialized && !isMasterAdmin && !branchId) {
      navigate('/login', { replace: true });
    }
  }, [isInitialized, isMasterAdmin, branchId, navigate]);

  // 3. Render Gatekeeper
  if (shouldHideGate || !branchId) {
    return null;
  }

  // --- Handlers ---
  const submitPin = async (nextPin: string) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError('');

    try {
      const response = await api.post('/auth/instructor-login', {
        pin: nextPin,
        branch_id: branchId,
      });

      const nextInstructor = response.data.staff_session ?? response.data.instructor_session;

      if (!nextInstructor?.name) {
        throw new Error('Instructor session was not returned.');
      }

      setInstructor(withFallbackExpiry(nextInstructor));
      playSuccessChime();
      setIsExiting(true);

      // Allow animation to finish before hiding component
      window.setTimeout(() => setIsExiting(false), 720);

    } catch (loginError: any) {
      const message =
        loginError.response?.data?.message ??
        loginError.message ??
        'Invalid instructor PIN.';

      setError(message);
      navigator.vibrate?.(30);
      await shakeControls.start({
        x: [0, -12, 12, -8, 8, 0],
        transition: { duration: 0.34 },
      });
      setPin('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (value: string) => {
    if (isSubmitting) return;

    if (value === 'Clear') {
      setPin('');
      setError('');
      return;
    }

    if (pin.length >= 4) return;

    const nextPin = `${pin}${value}`;
    setPin(nextPin);

    if (nextPin.length === 4) {
      void submitPin(nextPin);
    }
  };

  return (
    <AnimatePresence>
      <motion.section
        className="instructor-gate"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        aria-label="Instructor PIN gate"
      >
        <motion.div
          className="instructor-panel"
          initial={{ y: 34, opacity: 0, scale: 0.98 }}
          animate={isExiting ? { y: '-115vh', opacity: 0, scale: 0.98 } : { y: 0, opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 170, damping: 22 }}
        >
          <div className="gate-copy">
            <p className="eyebrow">Instructor Shift</p>
            <h2>
              {instructor?.name ? `Welcome, ${instructor.name}` : 'Enter PIN'}
            </h2>
            <p>
              Start a protected 12-hour shift session for attendance operations.
            </p>
          </div>

          <motion.div className="pin-dots" animate={shakeControls}>
            {[0, 1, 2, 3].map((index) => (
              <span
                key={index}
                className={index < pin.length ? 'filled' : ''}
              />
            ))}
          </motion.div>

          {error && (
            <p className="gate-error" role="alert">
              {error}
            </p>
          )}

          <div className="keypad" aria-label="Numeric PIN keypad">
            {keypadItems.map((item) => (
              <motion.button
                key={item}
                type="button"
                className={item === 'Clear' ? 'keypad-button clear' : 'keypad-button'}
                whileTap={{ scale: 0.94 }}
                disabled={isSubmitting}
                onClick={() => handleKeyPress(item)}
              >
                {item}
              </motion.button>
            ))}
          </div>

          {isSubmitting && (
            <div className="gate-loading" aria-live="polite">
              <span className="gold-spinner" aria-hidden="true" />
              Verifying shift...
            </div>
          )}
        </motion.div>
      </motion.section>
    </AnimatePresence>
  );
}