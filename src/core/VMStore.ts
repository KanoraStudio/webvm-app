import { openDB } from 'idb'
import { VMConfig } from '../types/VMConfig'

export class VMStore {
  private dbP = openDB('webvm-v2', 2, {
    upgrade(db, oldVersion) {
      if (!db.objectStoreNames.contains('vms'))   db.createObjectStore('vms',  { keyPath: 'id' })
      if (!db.objectStoreNames.contains('hdds'))  db.createObjectStore('hdds')
      if (!db.objectStoreNames.contains('isos'))  db.createObjectStore('isos')
    },
  })

  // ── VM config ────────────────────────────────────────────────────
  async saveVM(vm: VMConfig) {
    (await this.dbP).put('vms', vm)
  }
  async loadVMs(): Promise<VMConfig[]> {
    return (await this.dbP).getAll('vms')
  }
  async deleteVM(id: string) {
    const db = await this.dbP
    const vm = await db.get('vms', id)
    if (vm) await db.delete('hdds', vm.hddKey)
    await db.delete('vms', id)
  }
  async getVM(id: string): Promise<VMConfig | undefined> {
    return (await this.dbP).get('vms', id)
  }

  // ── HDD image ────────────────────────────────────────────────────
  async saveHDD(key: string, buf: ArrayBuffer) {
    (await this.dbP).put('hdds', buf, key)
  }
  async loadHDD(key: string): Promise<ArrayBuffer | undefined> {
    return (await this.dbP).get('hdds', key)
  }

  // ── Export VM as .wvm file ────────────────────────────────────────
  async exportVM(id: string): Promise<Blob | null> {
    const db  = await this.dbP
    const vm  = await db.get('vms', id) as VMConfig
    if (!vm) return null
    const hdd = await db.get('hdds', vm.hddKey) as ArrayBuffer
    const payload = { config: vm, hdd: hdd ? Array.from(new Uint8Array(hdd)) : [] }
    return new Blob([JSON.stringify(payload)], { type: 'application/json' })
  }

  // ── Import .wvm file ─────────────────────────────────────────────
  async importVM(file: File): Promise<VMConfig> {
    const text    = await file.text()
    const payload = JSON.parse(text)
    const vm      = payload.config as VMConfig
    vm.id         = crypto.randomUUID()
    vm.hddKey     = `hdd_${vm.id}`
    const hdd = new Uint8Array(payload.hdd).buffer
    await this.saveHDD(vm.hddKey, hdd)
    await this.saveVM(vm)
    return vm
  }
}

export const vmStore = new VMStore()
