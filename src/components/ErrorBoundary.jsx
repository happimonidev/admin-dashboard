import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';
import Button from './ui/Button';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Surfaced to the console for debugging — swap for a real error
    // reporting service later if/when one is wired up.
    console.error('Render error caught by ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 rounded-card bg-white p-8 text-center shadow-sm ring-1 ring-ink-100">
          <div className="rounded-control bg-danger-50 p-2.5 text-danger-500">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <p className="text-sm font-medium text-ink-900">
            Something went wrong displaying this page
          </p>
          <p className="max-w-sm text-sm text-ink-500">
            This has been logged. Try again, or go back and reopen it.
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
