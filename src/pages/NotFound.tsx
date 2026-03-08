import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background page-enter">
      <div className="text-center">
        <h1 className="mb-2 text-6xl font-bold text-foreground tracking-tight">404</h1>
        <p className="mb-6 text-lg text-muted-foreground">Module not found</p>
        <a href="/" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Return to Laboratory
        </a>
      </div>
    </div>
  );
};

export default NotFound;
