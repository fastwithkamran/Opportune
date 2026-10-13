"use client";

import { useEffect, useRef } from "react";
import { Lottie, type LottieHandle } from "lottie-react";
import animationData from "../../public/animations/loading.json";

export default function LottieAnimation() {
  const lottieRef = useRef<LottieHandle>(null);

  // Force playback on mount for mobile browsers with restrictive autoplay policies
  useEffect(() => {
    const timer = setTimeout(() => {
      lottieRef.current?.play();
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      style={{
        width: "min(260px, 70vw)",
        height: "min(260px, 70vw)",
        maxWidth: 300,
        maxHeight: 300,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "0 auto",
      }}
    >
      <Lottie
        lottieRef={lottieRef}
        src={animationData}
        autoplay
        loop
        renderer="svg"
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}

