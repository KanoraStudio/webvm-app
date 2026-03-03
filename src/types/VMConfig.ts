export type OSType = 'windows' | 'linux' | 'macos' | 'dos' | 'other'

export interface VMConfig {
  id: string
  name: string
  osType: OSType
  osVersion: string
  memoryMB: number
  storageMB: number
  network: boolean
  createdAt: number
  lastUsed?: number
  isoName?: string
  hddKey: string
}

export const OS_PRESETS: Record<OSType, { label: string; icon: string; versions: string[]; defaultMem: number; defaultStorage: number }> = {
  windows: {
    label: 'Windows',
    icon: '🪟',
    versions: ['Windows XP', 'Windows 2000', 'Windows 98', 'Windows 95', 'Windows 11', 'Windows 10', 'Windows 7'],
    defaultMem: 512,
    defaultStorage: 20480,
  },
  linux: {
    label: 'Linux',
    icon: '🐧',
    versions: ['Ubuntu', 'Debian', 'Alpine Linux', 'Arch Linux', 'Fedora', 'CentOS', 'Mint', 'Kali Linux'],
    defaultMem: 512,
    defaultStorage: 20480,
  },
  macos: {
    label: 'macOS',
    icon: '🍎',
    versions: ['macOS Sonoma', 'macOS Ventura', 'macOS Monterey', 'macOS Big Sur', 'OS X El Capitan'],
    defaultMem: 2048,
    defaultStorage: 40960,
  },
  dos: {
    label: 'DOS',
    icon: '💾',
    versions: ['FreeDOS', 'MS-DOS 6.22', 'DR-DOS'],
    defaultMem: 64,
    defaultStorage: 2048,
  },
  other: {
    label: 'その他',
    icon: '💿',
    versions: ['FreeBSD', 'ReactOS', 'Haiku', 'その他'],
    defaultMem: 256,
    defaultStorage: 10240,
  },
}
