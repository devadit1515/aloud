"use client";

import { useEffect, useRef, useState } from "react";
import { icons } from "lucide-react";
import { cues } from "@/lib/cues.mjs";
// [CALIBRATION DISABLED] — original import kept for when calibration returns.
// import { computeThresholds, saveThresholds, loadThresholds, DEFAULTS } from "@/lib/blink.mjs";
import { loadThresholds, DEFAULTS } from "@/lib/blink.mjs";

function LIcon({ name, size = 26, stroke = 1.6 }) {
  const Cmp = icons[name] || icons.Circle;
  return <Cmp size={size} strokeWidth={stroke} aria-hidden />;
}

const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm";
const MODEL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

const HOLD_MS = 600;
const REFIRE_MS = 700;
const DETECT_MS = 62;

// [CALIBRATION DISABLED] — original signature kept for when calibration returns.
// export default function BlinkCam({ onLongBlink, onEyesClosed, onError, onCalibrating, onReady, recalNonce = 0, say }) {
export default function BlinkCam({ onLongBlink, onEyesClosed, onError, onReady, say }) {
  const videoRef = useRef(null);
  const [armed, setArmed] = useState(false);
  const [meter, setMeter] = useState(0);
  const [hold, setHold] = useState(0);
  const [fired, setFired] = useState(false);
  // [CALIBRATION DISABLED]
  // const [phase, setPhaseState] = useState("detect");
  const [minimized, setMinimized] = useState(false);

  // [CALIBRATION DISABLED] — no calibration step, so use thresholds saved by an
  // earlier calibration if there are any, otherwise the defaults.
  // const closeRef = useRef(DEFAULTS.close);
  // const openRef = useRef(DEFAULTS.open);
  const [saved] = useState(loadThresholds);
  const closeRef = useRef((saved ?? DEFAULTS).close);
  const openRef = useRef((saved ?? DEFAULTS).open);
  const phaseRef = useRef("detect");
  // [CALIBRATION DISABLED]
  // const sampleRef = useRef(null);
  // const openS = useRef([]);
  // const closedS = useRef([]);
  const timers = useRef([]);

  // [CALIBRATION DISABLED]
  // const cb = useRef({ onLongBlink, onEyesClosed, onError, onCalibrating, onReady, say });
  // cb.current = { onLongBlink, onEyesClosed, onError, onCalibrating, onReady, say };
  const cb = useRef({ onLongBlink, onEyesClosed, onError, onReady, say });
  cb.current = { onLongBlink, onEyesClosed, onError, onReady, say };

  // [CALIBRATION DISABLED]
  // const setPhase = (p) => { phaseRef.current = p; setPhaseState(p); };
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };

  // [CALIBRATION DISABLED] — commented out for now, do not delete.
  // const finishCalibration = () => {
  //   sampleRef.current = null;
  //   const t = computeThresholds(openS.current, closedS.current) || DEFAULTS;
  //   closeRef.current = t.close; openRef.current = t.open;
  //   saveThresholds(t);
  //   try { cues.select(); } catch {}
  //   setPhase("instructions");
  //   timers.current.push(setTimeout(() => { setPhase("detect"); cb.current.onCalibrating?.(false); }, 5000));
  // };
  //
  // const skipCalibration = () => {
  //   clearTimers();
  //   sampleRef.current = null;
  //   const saved = loadThresholds();
  //   if (saved) { closeRef.current = saved.close; openRef.current = saved.open; }
  //   try { cues.select(); } catch {}
  //   setPhase("detect");
  //   cb.current.onCalibrating?.(false);
  // };
  //
  // const startCalibration = () => {
  //   clearTimers();
  //   openS.current = []; closedS.current = []; sampleRef.current = null;
  //   cb.current.onCalibrating?.(true);
  //   setPhase("open");
  //   timers.current.push(setTimeout(() => { sampleRef.current = "open"; }, 700));
  //   timers.current.push(setTimeout(() => {
  //     sampleRef.current = null; setPhase("ready");
  //   }, 2700));
  //   timers.current.push(setTimeout(() => {
  //     setPhase("closed");
  //     try { cues.add(); } catch {}
  //   }, 5000));
  //   timers.current.push(setTimeout(() => { sampleRef.current = "closed"; }, 5700));
  //   timers.current.push(setTimeout(finishCalibration, 7700));
  // };

  useEffect(() => {
    let landmarker = null, stream = null, raf = 0, cancelled = false;
    let closed = false, closedStart = 0, didFire = false, lastFire = 0;
    let lastDetect = 0, lastVideoTime = -1, lastMeterPct = -1, lastHoldStep = -1, uiFired = false;

    async function init() {
      try {
        const streamP = navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: 480, height: 360 }, audio: false,
        });
        const modelP = (async () => {
          const { FilesetResolver, FaceLandmarker } = await import("@mediapipe/tasks-vision");
          const fileset = await FilesetResolver.forVisionTasks(WASM);
          return FaceLandmarker.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: MODEL, delegate: "GPU" },
            outputFaceBlendshapes: true, runningMode: "VIDEO", numFaces: 1,
          });
        })();

        stream = await streamP;
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        const video = videoRef.current;
        video.srcObject = stream;
        await video.play();

        landmarker = await modelP;
        if (cancelled) return;
        setArmed(true);
        cb.current.onReady?.();
        // [CALIBRATION DISABLED] — go straight to blink detection.
        // cb.current.onCalibrating?.(true);
        // setPhase("intro");
        loop();
      } catch (e) {
        console.error("[BlinkCam]", e);
        cb.current.onError?.("Couldn't start the camera. You can still use a keyboard or click.");
      }
    }

    function loop() {
      if (cancelled) return;
      const video = videoRef.current;
      const now = performance.now();
      if (video && landmarker && now - lastDetect >= DETECT_MS && video.currentTime !== lastVideoTime && video.readyState >= 2) {
        lastDetect = now; lastVideoTime = video.currentTime;
        const res = landmarker.detectForVideo(video, now);
        const cats = res?.faceBlendshapes?.[0]?.categories;
        if (cats) {
          const g = (n) => cats.find((c) => c.categoryName === n)?.score ?? 0;
          const blink = Math.max(g("eyeBlinkLeft"), g("eyeBlinkRight"));
          const pct = Math.round(blink * 100);
          if (Math.abs(pct - lastMeterPct) >= 6) { lastMeterPct = pct; setMeter(blink); }

          // [CALIBRATION DISABLED]
          // if (sampleRef.current === "open") openS.current.push(blink);
          // else if (sampleRef.current === "closed") closedS.current.push(blink);

          if (phaseRef.current === "detect") {
            const CLOSE = closeRef.current, OPEN = openRef.current;
            if (!closed && blink > CLOSE) {
              closed = true; closedStart = now; didFire = false;
              if (uiFired) { uiFired = false; setFired(false); }
              cb.current.onEyesClosed?.(true);
            } else if (closed && blink < OPEN) {
              closed = false;
              if (lastHoldStep !== 0) { lastHoldStep = 0; setHold(0); }
              if (uiFired) { uiFired = false; setFired(false); }
              cb.current.onEyesClosed?.(false);
            } else if (closed && !didFire) {
              const held = now - closedStart;
              if (held >= HOLD_MS && now - lastFire >= REFIRE_MS) {
                didFire = true; lastFire = now;
                setHold(1); uiFired = true; setFired(true); lastHoldStep = 10;
                try { cues.select(); } catch {  }
                cb.current.onLongBlink?.();
              } else {
                const step = Math.min(9, Math.round((held / HOLD_MS) * 10));
                if (step !== lastHoldStep) { lastHoldStep = step; setHold(held / HOLD_MS); }
              }
            }
          } else if (closed) {
            closed = false;
            if (uiFired) { uiFired = false; setFired(false); }
            if (lastHoldStep !== 0) { lastHoldStep = 0; setHold(0); }
          }
        }
      }
      raf = requestAnimationFrame(loop);
    }

    init();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      clearTimers();
      if (stream) stream.getTracks().forEach((t) => t.stop());
      try { landmarker?.close?.(); } catch {}
    };
  }, []);

  // [CALIBRATION DISABLED]
  // useEffect(() => {
  //   if (recalNonce > 0) startCalibration();
  // }, [recalNonce]);

  const closing = hold > 0 && !fired;
  // [CALIBRATION DISABLED]
  // const calibrating = phase !== "detect";
  return (
    <>
      {/* [CALIBRATION DISABLED] — calibration dialog commented out, do not delete.
      {calibrating && (
        <div className="calib" role="dialog" aria-label="Eye control setup">
          <div className="calib-card">
            {phase === "intro" && (
              <>
                <span className="calib-ico"><LIcon name="ScanFace" size={34} /></span>
                <h2>Set up eye control</h2>
                <p>A quick check tunes blinking to your eyes and lighting. Tap Start and follow along — it takes about ten seconds.</p>
                <div className="calib-actions">
                  <button className="calib-go" onClick={startCalibration}>Start</button>
                  <button className="calib-skip" onClick={skipCalibration}>Skip for now</button>
                </div>
              </>
            )}
            {(phase === "open" || phase === "ready" || phase === "closed") && (
              <>
                <span className={`calib-eye ${phase}`}><LIcon name={phase === "closed" ? "EyeOff" : "Eye"} size={40} /></span>
                <h2>{phase === "open" ? "Keep your eyes open" : phase === "ready" ? "Get ready…" : "Close your eyes now"}</h2>
                <p>{phase === "open" ? "Look at the screen, relaxed."
                  : phase === "ready" ? "When you hear the beep, close your eyes and hold them shut."
                  : "Hold them shut until you hear the next tone."}</p>
                <div className="calib-bar" key={phase}><i style={{ animationDuration: phase === "ready" ? "2.3s" : "2.7s" }} /></div>
              </>
            )}
            {phase === "done" && (
              <>
                <span className="calib-ico done"><LIcon name="Check" size={34} stroke={2.4} /></span>
                <h2>All set</h2>
                <p>Eye control is tuned to you. Take a long blink to choose.</p>
              </>
            )}
            {phase === "instructions" && (
              <>
                <span className="calib-ico done"><LIcon name="Zap" size={34} stroke={2.4} /></span>
                <h2>Ready to go</h2>
                <p>The highlight moves on its own. When you see what you want, hold your eyes closed for about half a second.</p>
              </>
            )}
          </div>
        </div>
      )}
      */}

      <div className={`cam-bubble ${armed ? "armed" : ""} ${closing ? "blinking" : ""} ${fired ? "fired" : ""} ${minimized ? "pinned" : ""}`}>
        <button className="cam-min" onClick={() => setMinimized(true)} aria-label="Minimize video" title="Minimize video">
          <LIcon name="PanelRightClose" size={15} stroke={2} />
        </button>
        <div className="eyemeter"><i style={{ width: `${Math.round(meter * 100)}%` }} /></div>
        <div className="cam-hold"><i style={{ width: `${Math.round(hold * 100)}%` }} /></div>
        <video ref={videoRef} muted playsInline />
        <div className="cam-state">
          <span className="ring" />
          {/* [CALIBRATION DISABLED] was: {!armed ? "Starting camera…" : calibrating ? "Calibrating…" : fired ? "Got it ✓" : closing ? "Hold…" : "Tracking your eyes"} */}
          {!armed ? "Starting camera…" : fired ? "Got it ✓" : closing ? "Hold…" : "Tracking your eyes"}
        </div>
        <button className="cam-expand" onClick={() => setMinimized(false)} aria-label="Show video" title="Show video">
          <LIcon name="Eye" size={17} stroke={2} />
          <LIcon name="ChevronLeft" size={13} stroke={2.6} />
        </button>
      </div>
    </>
  );
}
