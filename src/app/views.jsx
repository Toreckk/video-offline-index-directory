import { Compass, FolderOpen, PlayCircle, Settings } from "lucide-react";
import Explorer from "../views/Explorer";
import Folders from "../views/Folders";
import Player from "../views/Player";
import SettingsView from "../views/Settings";

export const VIEW_IDS = {
  explorer: "explorer",
  player: "player",
  folders: "folders",
  settings: "settings",
};

export const APP_VIEWS = [
  {
    id: VIEW_IDS.explorer,
    label: "Explorer",
    icon: Compass,
    component: Explorer,
  },
  {
    id: VIEW_IDS.player,
    label: "Player",
    icon: PlayCircle,
    component: Player,
  },
  {
    id: VIEW_IDS.folders,
    label: "Folders",
    icon: FolderOpen,
    component: Folders,
  },
  {
    id: VIEW_IDS.settings,
    label: "Settings",
    icon: Settings,
    component: SettingsView,
  },
];

export const DEFAULT_VIEW_ID = VIEW_IDS.explorer;
