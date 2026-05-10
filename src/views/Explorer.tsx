import HomePage from '../components/homepage/HomePage'
import Library from '../components/library/Library'

export default function Explorer() {
  // In the future, this will check if a library directory has been configured
  // via the Zustand store. For now, always show the HomePage.
  const isLibraryConfigured = false

  return isLibraryConfigured ? <Library /> : <HomePage />
}
