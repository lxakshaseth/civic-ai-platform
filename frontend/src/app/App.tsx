import { RouterProvider } from 'react-router';
import { router } from './routes';
import { Toaster } from './components/ui/sonner';

export default function App() {
  return (
    <>
      <RouterProvider router={router} fallbackElement={<div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>} />
      <Toaster />
    </>
  );
}