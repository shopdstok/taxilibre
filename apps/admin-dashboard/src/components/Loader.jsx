import React from 'react';

export default function Loader({ message = 'Chargement...', fullScreen = false }) {
  const content = (
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
      {message && <p className="mt-2 text-gray-600">{message}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        {content}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-[60vh]">
      {content}
    </div>
  );
}