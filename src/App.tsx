import { useState, useRef } from 'react';
import AppRoutes from "./routes/AppRoutes";
import { LoadingScreen } from './components/ui/LoadingScreen';

const MIN_LOADING_MS = 3500;

function App() {
  const [showLoading, setShowLoading] = useState(true);
  const startRef = useRef(Date.now());

  const handleLoadingComplete = () => {
    const elapsed = Date.now() - startRef.current;
    const remaining = Math.max(0, MIN_LOADING_MS - elapsed);
    setTimeout(() => setShowLoading(false), remaining);
  };

  return (
    <>
      {showLoading && <LoadingScreen onLoadingComplete={handleLoadingComplete} />}
      <AppRoutes />
    </>
  );
}

export default App;