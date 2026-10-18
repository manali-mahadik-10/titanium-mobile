import { Component } from 'react'

// shows the real error on screen instead of a blank page
export default class ErrorBoundary extends Component {
  state = { err: null }

  static getDerivedStateFromError(err) {
    return { err }
  }

  componentDidUpdate(prev) {
    if (prev.resetKey !== this.props.resetKey && this.state.err) this.setState({ err: null })
  }

  render() {
    if (!this.state.err) return this.props.children
    return (
      <div className="safe-top px-5">
        <h2 className="font-display text-xl text-rose-300">This screen crashed</h2>
        <p className="mt-2 text-sm text-mist">Take a screenshot of this text and send it to Claude:</p>
        <pre className="mt-3 whitespace-pre-wrap break-all rounded-xl border border-rose-400/40 bg-ink-800 p-3 text-xs text-cream">{String(this.state.err?.stack || this.state.err)}</pre>
      </div>
    )
  }
}