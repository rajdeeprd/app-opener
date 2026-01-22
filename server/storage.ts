// Using MemStorage as no persistence was requested, but keeping structure for consistency
export interface IStorage {
  // No persistent storage needed for this app
}

export class MemStorage implements IStorage {
  constructor() {}
}

export const storage = new MemStorage();
