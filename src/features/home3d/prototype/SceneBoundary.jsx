import { Component } from 'react'

export default class SceneBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    console.error('Focus figure scene failed to render.', error)
    this.props.onError?.(error)
  }

  render() {
    if (this.state.failed) {
      return this.props.fallback ?? (
        <div className="prototype-stage__message" role="status">
          The 3D preview could not start. WebGL may be unavailable in this browser.
        </div>
      )
    }

    return this.props.children
  }
}
