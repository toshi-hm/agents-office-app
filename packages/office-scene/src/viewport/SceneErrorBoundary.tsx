import { Component } from 'react';
import type { ReactNode } from 'react';

/** Renders nothing once the 3D scene throws, and reports the failure. */
export class SceneErrorBoundary extends Component<
  { children: ReactNode; onFailure: () => void },
  { failed: boolean }
> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch(error: unknown) {
    console.error('[office-scene]', error);
    this.props.onFailure();
  }
  override render() {
    return this.state.failed ? null : this.props.children;
  }
}
