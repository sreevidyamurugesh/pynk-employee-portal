import { useState, useEffect } from 'react'
import { EmployeePortalLogin } from './EmployeePortalLogin'
import { EmployeePortalFlow } from './EmployeePortalFlow'

type UserType = 'employee' | 'admin' | 'client' | null

interface EmployeeMenuProps {
  onSelectOption: (optionId: string) => void
  selectedOption?: string
  onLoginStateChange?: (isLoggedIn: boolean) => void
  onUserTypeChange?: (userType: UserType | null) => void
  themeMode?: 'dark' | 'light'
  toggleTheme?: () => void
  notifications?: any[]
  setNotifications?: any
  isNotificationDrawerOpen?: boolean
  setIsNotificationDrawerOpen?: (open: boolean) => void
}

export function EmployeeMenu({
  onSelectOption: _onSelectOption,
  selectedOption: _selectedOption,
  onLoginStateChange,
  onUserTypeChange,
  themeMode,
  toggleTheme,
  notifications = [],
  setNotifications = () => {},
  isNotificationDrawerOpen = false,
  setIsNotificationDrawerOpen = () => {}
}: EmployeeMenuProps) {
  const [userType, setUserType] = useState<UserType>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const savedUserType = localStorage.getItem('portalUserType') as UserType
    if (savedUserType) {
      setUserType(savedUserType)
      setIsLoggedIn(true)
      onLoginStateChange?.(true)
      onUserTypeChange?.(savedUserType)
    }
  }, [])

  const handleLogin = (type: UserType) => {
    setUserType(type)
    setIsLoggedIn(true)
    onLoginStateChange?.(true)
    onUserTypeChange?.(type)
  }


  if (!isLoggedIn || !userType) {
    return <EmployeePortalLogin onLogin={handleLogin} themeMode={themeMode} toggleTheme={toggleTheme} />
  }

  return (
    <EmployeePortalFlow
      userType={userType}
      notifications={notifications}
      setNotifications={setNotifications}
      isNotificationDrawerOpen={isNotificationDrawerOpen}
      setIsNotificationDrawerOpen={setIsNotificationDrawerOpen}
    />
  )
}
