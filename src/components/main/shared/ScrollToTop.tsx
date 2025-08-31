import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export function ScrollToTopWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { pathname } = useLocation();

  useEffect(() => {
    // Use requestAnimationFrame to ensure DOM updates are complete
    // then scroll to top when route changes
    const scrollToTop = () => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "instant", // Use instant to avoid conflicts with animations
      });
    };

    // Multiple fallbacks to ensure scroll works
    scrollToTop(); // Immediate scroll

    requestAnimationFrame(() => {
      scrollToTop(); // After current render cycle
    });

    // Additional timeout for complex animations
    const timeoutId = setTimeout(() => {
      scrollToTop();
    }, 100);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [pathname]);

  return <>{children}</>;
}
