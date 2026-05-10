import type { ComponentType } from 'react'
import {
  Compass,
  FolderOpen,
  PlayCircle,
  Settings,
  type LucideIcon,
} from 'lucide-react'
import Explorer from '../views/Explorer'
import Folders from '../views/Folders'
import Player from '../views/Player'
import SettingsView from '../views/Settings'

export const VIEW_IDS = {
  explorer: 'explorer',
  player: 'player',
  folders: 'folders',
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
    id: VIEW_IDS.player,
    label: 'Player',
    icon: PlayCircle,
    component: Player,
  },
  {
    id: VIEW_IDS.folders,
    label: 'Folders',
    icon: FolderOpen,
    component: Folders,
  },
  {
    id: VIEW_IDS.settings,
    label: 'Settings',
    icon: Settings,
    component: SettingsView,
  },
]

export const DEFAULT_VIEW_ID = VIEW_IDS.explorer
