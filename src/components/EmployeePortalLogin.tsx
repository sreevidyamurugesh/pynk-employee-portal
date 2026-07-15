import { useState } from 'react'
import pynkLogoDark from '../assets/logo.png'
import pynkLogoLight from '../assets/output-onlinepngtools.png'

type UserType = 'employee' | 'admin' | 'client' | null
type LoginStep = 'role' | 'credentials'

interface EmployeePortalLoginProps {
  onLogin: (userType: UserType) => void
  themeMode?: 'dark' | 'light'
  toggleTheme?: () => void
}

export function EmployeePortalLogin({ onLogin, themeMode, toggleTheme }: EmployeePortalLoginProps) {
  const [step, setStep] = useState<LoginStep>('role')
  const [userType, setUserType] = useState<UserType>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)

  const activeLogo = themeMode === 'light' ? pynkLogoLight : pynkLogoDark

  const roleInfo: Record<'employee' | 'admin' | 'client', { icon: string; label: string; desc: string; badge: string }> = {
    employee: { icon: '👤', label: 'Employee Portal', desc: 'Access payroll, leave, documents', badge: 'Employee Portal' },
    client: { icon: '🏢', label: 'Client Portal', desc: 'View employee & team data', badge: 'Client Portal' },
    admin: { icon: '👨‍💼', label: 'Admin Portal', desc: 'Payroll Operations & Workforce Management', badge: 'Admin Portal' },
  }

  const handleRoleSelect = (type: UserType) => {
    setUserType(type)
    setStep('credentials')
  }

  const handleLogin = () => {
    if (userType && username && password) {
      localStorage.setItem('portalUserType', userType)
      localStorage.setItem('portalLoginTime', new Date().toISOString())
      localStorage.setItem('portalUsername', username)
      onLogin(userType)
    }
  }

  // Dynamic branding text based on selected role
  let dynamicTitle = 'Deploy, run, and scale teams globally.'
  let dynamicDesc = 'Select your portal role to access your dashboard, manage operations, and view payroll details.'

  if (step === 'credentials' && userType) {
    if (userType === 'employee') {
      dynamicTitle = 'Welcome back!'
      dynamicDesc = 'Sign in to access your Pynk Employee Portal and manage your payslips, request leave, and update your profile details.'
    } else if (userType === 'admin') {
      dynamicTitle = 'Welcome back!'
      dynamicDesc = 'Sign in to access your Pynk Admin Portal and manage your global workforce.'
    } else if (userType === 'client') {
      dynamicTitle = 'Welcome back!'
      dynamicDesc = 'Sign in to access your Pynk Client Portal, configure pay cycles, and approve team timesheets.'
    }
  }

  return (
    <>
      <div className="portal-login-fullscreen">
        {/* Left Column: Sidebar Branding & illustration */}
        <div className="login-sidebar">
          <div className="sidebar-top">
            <img src={activeLogo} alt="Pynk" className="login-sidebar-logo" />
          </div>

          <div className="sidebar-middle">
            <h1 className="sidebar-heading">{dynamicTitle}</h1>
            <p className="sidebar-desc">{dynamicDesc}</p>

            {/* Premium CSS Vector Illustration mockup */}
            <div className="sidebar-illustration">
              <div className="mockup-frame">
                <div className="mockup-header">
                  <span className="dot dot-red"></span>
                  <span className="dot dot-yellow"></span>
                  <span className="dot dot-green"></span>
                </div>
                <div className="mockup-body">
                  <div className="mockup-row">
                    <div className="mockup-card circular-card">
                      <div className="mockup-circle">
                        <div className="mockup-circle-inner"></div>
                      </div>
                      <div className="mockup-lines">
                        <div className="mockup-line long"></div>
                        <div className="mockup-line medium"></div>
                      </div>
                    </div>
                    <div className="mockup-card profile-card">
                      <div className="mockup-avatar"></div>
                      <div className="mockup-rating">★★★★★</div>
                    </div>
                  </div>
                  <div className="mockup-card stats-card">
                    <div className="mockup-bars">
                      <div className="mockup-bar bar-1"></div>
                      <div className="mockup-bar bar-2"></div>
                      <div className="mockup-bar bar-3"></div>
                      <div className="mockup-bar bar-4"></div>
                      <div className="mockup-bar bar-5"></div>
                    </div>
                    <div className="mockup-lock-badge">🔒</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="sidebar-bottom">
            <p className="copyright-txt">© 2026 Pynk Worldwide · All rights reserved</p>
          </div>
        </div>

        {/* Right Column: Main sign-in cards */}
        <div className="login-main">
          <div className="login-box-container">
            {step === 'role' ? (
              <div className="login-box-card">
                <div className="login-box-header">
                  <span className="portal-badge-label">Portal Access</span>
                  <h2>Welcome to Pynk</h2>
                  <p className="subtitle-txt">Choose a portal to sign in and continue</p>
                </div>

                <div className="login-roles-list">
                  {(['employee', 'client', 'admin'] as const).map((role) => (
                    <button
                      key={role}
                      className="role-selection-card"
                      onClick={() => handleRoleSelect(role)}
                    >
                      <div className="role-selection-icon">{roleInfo[role].icon}</div>
                      <div className="role-selection-info">
                        <h3 className="role-selection-label">{roleInfo[role].label}</h3>
                        <p className="role-selection-desc">{roleInfo[role].desc}</p>
                      </div>
                      <div className="role-selection-arrow">→</div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="login-box-card">
                <div className="login-box-header" style={{ position: 'relative' }}>
                  <button className="back-to-roles-btn" onClick={() => setStep('role')} title="Back to portals">
                    ← Back
                  </button>
                  <span className="portal-badge-label highlight">{roleInfo[userType!].badge}</span>
                  <h2>Sign in to your account</h2>
                  <p className="subtitle-txt">Enter your credentials to continue</p>
                </div>

                <form
                  className="login-form-fields"
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleLogin()
                  }}
                >
                  <div className="form-input-group">
                    <label htmlFor="username">Email Address</label>
                    <div className="input-field-wrapper">
                      <span className="input-field-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                          <polyline points="22,6 12,13 2,6"></polyline>
                        </svg>
                      </span>
                      <input
                        id="username"
                        type="text"
                        placeholder="Enter your email"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="form-control-input"
                        autoComplete="username"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-input-group">
                    <label htmlFor="password">Password</label>
                    <div className="input-field-wrapper">
                      <span className="input-field-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                      </span>
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="form-control-input"
                        autoComplete="current-password"
                        required
                      />
                      <button
                        type="button"
                        className="password-toggle-trigger"
                        onClick={() => setShowPassword(!showPassword)}
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          {showPassword ? (
                            <>
                              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                              <line x1="1" y1="1" x2="23" y2="23"></line>
                            </>
                          ) : (
                            <>
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                            </>
                          )}
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="form-extra-options">
                    <label className="checkbox-container-label">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                      />
                      <span className="checkbox-custom"></span>
                      Remember me
                    </label>
                    <a href="#forgot" className="forgot-password-link" onClick={(e) => e.preventDefault()}>
                      Forgot password?
                    </a>
                  </div>

                  <button
                    type="submit"
                    className="btn-primary-submit"
                    disabled={!username || !password}
                  >
                    Sign In
                  </button>
                </form>

                <div className="login-box-footer">
                  <p className="version-txt">Version 1.0.0</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {toggleTheme && (
        <button
          type="button"
          className="login-theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${themeMode === 'dark' ? 'Light' : 'Dark'} Mode`}
          title={`Switch to ${themeMode === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {themeMode === 'dark' ? '☀️' : '🌙'}
        </button>
      )}
    </>
  )
}
