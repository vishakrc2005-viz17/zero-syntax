import Dexie, { Table } from 'dexie'
export interface Sample { t: number; db: number; type: string }
export interface Ev { t: number; label: string }
export interface Session {
  id?: number; start: number; dur: number; place: string; avgDb: number; peakDb: number
  pct: { good: number; distracting: number; loud: number }
  sound: string; volume: number; noiseType: string; tod: string
  samples: Sample[]; events: Ev[]; rating?: number; helped?: 'helped' | 'none' | 'annoying'
}
export interface Log { id?: number; ts: number; dow: number; hour: number; db: number; type: string; place: string }
export interface CustomSound { id: string; name: string; file: Blob }
export interface ScheduleTask {
  id?: number; title: string; category: 'work' | 'study'; date: string; time: string; completed: boolean; createdAt: number
}
class DB extends Dexie {
  sessions!: Table<Session, number>; logs!: Table<Log, number>; customSounds!: Table<CustomSound, string>
  scheduleTasks!: Table<ScheduleTask, number>
  constructor() {
    super('calmstudy')
    this.version(1).stores({ sessions: '++id,start,place', logs: '++id,ts,place' })
    this.version(2).stores({ sessions: '++id,start,place', logs: '++id,ts,place', customSounds: 'id' })
    this.version(3).stores({
      sessions: '++id,start,place', logs: '++id,ts,place', customSounds: 'id', scheduleTasks: '++id,date,completed,category',
    })
  }
}
export const db = new DB()
