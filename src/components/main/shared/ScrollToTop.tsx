import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export function ScrollToTopWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll to top when route changes
    window.scrollTo(0, 0);
  }, [pathname]);

  return <>{children}</>;
}
