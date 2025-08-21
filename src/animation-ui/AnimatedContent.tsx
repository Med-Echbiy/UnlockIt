import React, { useRef, useEffect, ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLocation } from "react-router-dom";

gsap.registerPlugin(ScrollTrigger);

interface AnimatedContentProps {
  children: ReactNode;
  variant?:
    | "slide"
    | "fade"
    | "splash"
    | "zoom"
    | "flip"
    | "bounce"
    | "elastic"
    | "blur"
    | "rotate";
}

const AnimatedContent: React.FC<AnimatedContentProps> = ({
  children,
  variant = "slide",
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Define optimized settings for each variant
    const animationConfigs = {
      slide: {
        initial: { y: 50, opacity: 0 },
        final: { y: 0, opacity: 1 },
        duration: 0.8,
        ease: "power3.out",
      },
      fade: {
        initial: { opacity: 0 },
        final: { opacity: 1 },
        duration: 1.2,
        ease: "power2.out",
      },
      splash: {
        initial: { scale: 0, opacity: 0, rotation: 180 },
        final: { scale: 1, opacity: 1, rotation: 0 },
        duration: 1.0,
        ease: "back.out(1.7)",
      },
      zoom: {
        initial: { scale: 0.5, opacity: 0 },
        final: { scale: 1, opacity: 1 },
        duration: 0.6,
        ease: "power2.out",
      },
      flip: {
        initial: { rotationY: 90, opacity: 0 },
        final: { rotationY: 0, opacity: 1 },
        duration: 0.8,
        ease: "power2.out",
      },
      bounce: {
        initial: { y: 80, opacity: 0 },
        final: { y: 0, opacity: 1 },
        duration: 1.2,
        ease: "bounce.out",
      },
      elastic: {
        initial: { x: -100, opacity: 0 },
        final: { x: 0, opacity: 1 },
        duration: 1.5,
        ease: "elastic.out(1, 0.3)",
      },
      blur: {
        initial: { filter: "blur(10px)", opacity: 0 },
        final: { filter: "blur(0px)", opacity: 1 },
        duration: 1.0,
        ease: "power2.out",
      },
      rotate: {
        initial: { rotation: 360, scale: 0.8, opacity: 0 },
        final: { rotation: 0, scale: 1, opacity: 1 },
        duration: 1.2,
        ease: "power3.out",
      },
    };

    const config = animationConfigs[variant];

    // Set initial state
    gsap.set(el, config.initial);

    // Animate to final state with a small delay to ensure route change is complete
    const animation = gsap.to(el, {
      ...config.final,
      duration: config.duration,
      ease: config.ease,
      delay: 0.1, // Small delay to ensure smooth route transition
    });

    return () => {
      animation.kill();
      gsap.killTweensOf(el);
    };
  }, [variant, location.pathname]); // Trigger animation when route changes

  return <div ref={ref}>{children}</div>;
};

export default AnimatedContent;
