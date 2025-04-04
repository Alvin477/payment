'use client';

import { useEffect } from 'react';

export default function Home() {
  useEffect(() => {
    // Redirect after 2 seconds of showing the animation
    const timer = setTimeout(() => {
      window.location.href = 'https://bitorbs.com/login';
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="min-h-screen relative overflow-hidden bg-gray-900">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 animate-gradient-slow" />
      
      {/* Floating elements */}
      <div className="absolute inset-0">
        {/* Large orbs */}
        <div className="absolute top-1/4 left-1/4 w-48 h-48 bg-blue-500/10 rounded-full blur-xl animate-float-slow" />
        <div className="absolute top-1/3 right-1/4 w-56 h-56 bg-purple-500/10 rounded-full blur-xl animate-float-medium" />
        <div className="absolute bottom-1/4 left-1/3 w-52 h-52 bg-cyan-500/10 rounded-full blur-xl animate-float-fast" />
        
        {/* Medium orbs */}
        <div className="absolute top-1/2 right-1/3 w-32 h-32 bg-pink-500/10 rounded-full blur-lg animate-float-medium" />
        <div className="absolute bottom-1/3 right-1/4 w-40 h-40 bg-indigo-500/10 rounded-full blur-lg animate-float-slow" />
        
        {/* Small orbs */}
        <div className="absolute top-2/3 left-1/4 w-24 h-24 bg-emerald-500/10 rounded-full blur-md animate-float-fast" />
        <div className="absolute bottom-1/4 right-1/3 w-20 h-20 bg-yellow-500/10 rounded-full blur-md animate-float-medium" />
        <div className="absolute top-1/3 left-1/2 w-16 h-16 bg-red-500/10 rounded-full blur-md animate-float-slow" />
      </div>
    </main>
  );
}

// Add these styles to your globals.css or create a new style tag in your layout
const styles = `
@keyframes gradient {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@keyframes float-slow {
  0%, 100% { transform: translateY(0) translateX(0); }
  50% { transform: translateY(-20px) translateX(10px); }
}

@keyframes float-medium {
  0%, 100% { transform: translateY(0) translateX(0); }
  50% { transform: translateY(20px) translateX(-10px); }
}

@keyframes float-fast {
  0%, 100% { transform: translateY(0) translateX(0); }
  50% { transform: translateY(-15px) translateX(-15px); }
}

@keyframes title {
  0% { opacity: 0; transform: translateY(20px); }
  100% { opacity: 1; transform: translateY(0); }
}

@keyframes fade-in {
  0% { opacity: 0; transform: translateY(10px); }
  100% { opacity: 1; transform: translateY(0); }
}

.animate-gradient-slow {
  background-size: 200% 200%;
  animation: gradient 15s ease infinite;
}

.animate-float-slow {
  animation: float-slow 8s ease-in-out infinite;
}

.animate-float-medium {
  animation: float-medium 6s ease-in-out infinite;
}

.animate-float-fast {
  animation: float-fast 4s ease-in-out infinite;
}

.animate-title {
  animation: title 1s ease-out forwards;
}

.animate-fade-in {
  opacity: 0;
  animation: fade-in 1s ease-out forwards;
}
`;
