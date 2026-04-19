import { Button } from "../components/ui/button";
import { Link } from "react-router";
import { Home, ArrowLeft, FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
      <div className="text-center max-w-2xl">
        <div className="mb-8">
          <FileQuestion className="size-24 text-primary mx-auto mb-4 opacity-50" />
          <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Page Not Found</h2>
          <p className="text-lg text-gray-600 mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/">
            <Button size="lg" className="w-full sm:w-auto">
              <Home className="size-4 mr-2" />
              Go to Home
            </Button>
          </Link>
          <Button 
            size="lg" 
            variant="outline" 
            onClick={() => window.history.back()}
            className="w-full sm:w-auto"
          >
            <ArrowLeft className="size-4 mr-2" />
            Go Back
          </Button>
        </div>

        <div className="mt-12 p-6 bg-white rounded-xl shadow-sm">
          <h3 className="font-semibold mb-4">Quick Links</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <Link to="/public" className="text-primary hover:underline">
              Public Portal
            </Link>
            <Link to="/employee" className="text-primary hover:underline">
              Employee Portal
            </Link>
            <Link to="/admin" className="text-primary hover:underline">
              Admin Portal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
