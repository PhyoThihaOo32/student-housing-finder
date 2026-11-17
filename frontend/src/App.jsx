import { useEffect, useState } from 'react'
import { NavLink, Navigate, Route, Routes, useMatch } from 'react-router'
import { api } from './api.js'
import cunyLogoBlue from './assets/cuny-logo-blue.png'
import cunyLogoWhite from './assets/cuny-logo-white.png'
import AuthPage from './AuthPage.jsx'
import StaffPage from './StaffPage.jsx'
import { BrowseHousing, HousingApplication, MyRequests } from './StudentPage.jsx'

export default function App() {
  const browseHousingRoute = useMatch('/housing')
  const housingApplicationRoute = useMatch('/housing/:unitId/request')
  const requestHistoryRoute = useMatch('/requests')
  const staffRequestsRoute = useMatch('/staff/requests')
  const staffHousingRoute = useMatch('/staff/housing')
  const [dashboard, setDashboard] = useState(undefined)
  const [notice, setNotice] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    api('/dashboard', { signal: controller.signal })
      .then(setDashboard)
      .catch((error) => {
        if (controller.signal.aborted) return
        if (error.status !== 401) setNotice({ error: true, text: error.message })
        setDashboard(null)
      })
    return () => controller.abort()
  }, [])

  async function run(task) {
    setBusy(true)
    setNotice(null)
    try {
      await task()
    } catch (error) {
      if (error.status === 401) setDashboard(null)
      setNotice({ error: true, text: error.message })
    } finally {
      setBusy(false)
    }
  }

  function authenticate(path, body) {
    return run(async () => {
      await api(path, { method: 'POST', body })
      setDashboard(await api('/dashboard'))
    })
  }

  function signOut() {
    return run(async () => {
      await api('/session', { method: 'DELETE' })
      setDashboard(null)
    })
  }

  function change(path, options, message, onSaved) {
    return run(async () => {
      await api(path, options)
      try {
        setDashboard(await api('/dashboard'))
        setNotice({ text: message })
      } catch (error) {
        if (error.status === 401) setDashboard(null)
        setNotice({ error: true, text: `${message} Refresh the page to see the latest records.` })
      }
      onSaved?.()
    })
  }

  const student = dashboard?.user.student
  const studentTheme = browseHousingRoute ? 'browse-housing-page'
    : housingApplicationRoute ? 'housing-application-page'
      : requestHistoryRoute ? 'request-history-page' : ''
  const staffTheme = staffRequestsRoute ? 'staff-requests-page' : staffHousingRoute ? 'staff-housing-page' : ''
  const workspaceTheme = student ? studentTheme : staffTheme
  const pageTheme = dashboard === null ? 'welcome-page'
    : dashboard && workspaceTheme ? `workspace-background ${workspaceTheme}` : ''
  const pageProps = { dashboard, busy, change }

  return (
    <div className={`app-shell ${pageTheme}`}>
      <header className="site-header">
        <div className={dashboard ? 'header-inner signed-in-header' : 'header-inner'}>
          <span className="wordmark">
            <img
              className="brand-mark"
              src={pageTheme ? cunyLogoWhite : cunyLogoBlue}
              alt=""
              width={48}
              height={47}
            />
            CUNY Housing
          </span>
          {dashboard && <>
            <nav className="header-nav" aria-label="Housing workspace">
              {student ? <>
                <NavLink to="/housing">Browse housing</NavLink>
                <NavLink to="/requests">My requests</NavLink>
              </> : <>
                <NavLink to="/staff/requests">Review requests</NavLink>
                <NavLink to="/staff/housing">Housing units</NavLink>
              </>}
            </nav>
            <div className="header-account">
              <span>{student ? `${student.firstName} ${student.lastName}` : 'Campus staff'}</span>
              <button className="secondary" type="button" disabled={busy} onClick={signOut}>Sign out</button>
            </div>
          </>}
        </div>
      </header>
      <main>
        {notice && <p role={notice.error ? 'alert' : 'status'} className={`notice ${notice.error ? 'notice-error' : ''}`}>{notice.text}</p>}
        {dashboard === undefined ? <p role="status" className="muted">Loading housing workspace…</p>
          : dashboard === null ? (
            <Routes>
              <Route path="/login" element={<AuthPage key="login" busy={busy} submit={(body) => authenticate('/session', body)} />} />
              <Route path="/register" element={<AuthPage key="register" register busy={busy} submit={(body) => authenticate('/session/register', body)} />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          ) : student ? (
            <Routes>
              <Route path="/housing" element={<BrowseHousing dashboard={dashboard} />} />
              <Route path="/housing/:unitId/request" element={<HousingApplication {...pageProps} />} />
              <Route path="/requests" element={<MyRequests {...pageProps} />} />
              <Route path="*" element={<Navigate to="/housing" replace />} />
            </Routes>
          ) : (
            <Routes>
              <Route path="/staff/requests" element={<StaffPage {...pageProps} section="requests" />} />
              <Route path="/staff/housing" element={<StaffPage {...pageProps} section="units" />} />
              <Route path="*" element={<Navigate to="/staff/requests" replace />} />
            </Routes>
          )}
      </main>
      <footer className="site-footer">
        Built by <a href="https://www.linkedin.com/in/phyothihaoo/">Phyo Thiha Oo</a>
      </footer>
    </div>
  )
}
