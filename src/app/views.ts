import type { ComponentType } from 'react'
import {
  Compass,
  FolderOpen,
  LibraryBig,
  Settings,
  type LucideIcon,
} from 'lucide-react'
import Explorer from '../views/Explorer'
import Folders from '../views/Folders'
import SettingsView from '../views/Settings'
import Collections from '../views/Collections'

export const VIEW_IDS = {
  explorer: 'explorer',
  folders: 'folders',
  collections: 'collections',
  settings: 'settings',
} as const

export type ViewId = (typeof VIEW_IDS)[keyof typeof VIEW_IDS]

export type AppView = {
  id: ViewId
  label: string
  icon: LucideIcon
  component: ComponentType
}

export const APP_VIEWS: AppView[] = [
  {
    id: VIEW_IDS.explorer,
    label: 'Explorer',
    icon: Compass,
    component: Explorer,
  },
  {
    id: VIEW_IDS.folders,
    label: 'Library',
    icon: FolderOpen,
    component: Folders,
  },
  {
    id: VIEW_IDS.collections,
    label: 'Collections',
    icon: LibraryBig,
    component: Collections,
  },
  {
    id: VIEW_IDS.settings,
    label: 'Settings',
    icon: Settings,
    component: SettingsView,
  },
]

export const DEFAULT_VIEW_ID = VIEW_IDS.explorer
