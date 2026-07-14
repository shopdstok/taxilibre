import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-100 p-8 flex items-center justify-center">
          <div className="bg-red-100 border border-red-400 text-red-700 p-4 rounded">
            <h2 className="text-2xl font-bold mb-4">Something went wrong.</h2>
            <p className="mb-2">{this.state.error?.toString() ?? 'Unknown error'}</p>
            <button onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
