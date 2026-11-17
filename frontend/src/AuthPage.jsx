import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { api } from './api.js'

export default function AuthPage({ register = false, busy, submit }) {
  const [campuses, setCampuses] = useState([])
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    if (!register) return undefined
    const controller = new AbortController()
    api('/campuses', { signal: controller.signal }).then(setCampuses).catch((error) => {
      if (!controller.signal.aborted) setLoadError(error.message)
    })
    return () => controller.abort()
  }, [register])

  function onSubmit(event) {
    event.preventDefault()
    submit(Object.fromEntries(new FormData(event.currentTarget)))
  }

  return (
    <section className="welcome" aria-labelledby="welcome-title">
      <div className="welcome-intro">
        <h1 id="welcome-title">Find housing at your <span>CUNY campus</span></h1>
        <p>Explore demo rooms and beds, submit a housing request, and track its progress.</p>
      </div>
      <section className="welcome-account" aria-labelledby="account-title">
        <h2 id="account-title">{register ? 'Create a student account' : 'Sign in'}</h2>
        {loadError && <p className="muted" role="alert">{loadError}</p>}
        <form className="form-stack" onSubmit={onSubmit}>
          {register && (
            <>
              <div className="form-grid">
                <label>First name<input name="firstName" autoComplete="given-name" maxLength={80} required /></label>
                <label>Last name<input name="lastName" autoComplete="family-name" maxLength={80} required /></label>
              </div>
              <label>CUNY campus
                <select name="campusId" defaultValue="" required>
                  <option value="" disabled>{campuses.length ? 'Choose your campus' : 'Loading campuses…'}</option>
                  {campuses.map((campus) => <option value={campus.campusId} key={campus.campusId}>{campus.name}</option>)}
                </select>
              </label>
            </>
          )}
          <label>Email<input name="email" type="email" autoComplete="username" maxLength={254} required /></label>
          <label>Password
            <input name="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} minLength={8} maxLength={128} required />
          </label>
          <button className="primary" disabled={busy || (register && !campuses.length)}>
            {register ? 'Create account' : 'Sign in'}
          </button>
        </form>
        <p className="auth-switch">
          {register ? <>Already have an account? <Link to="/login">Sign in</Link></>
            : <>New student? <Link to="/register">Create an account</Link></>}
        </p>
      </section>
    </section>
  )
}
