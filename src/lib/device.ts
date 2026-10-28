import { v4 as uuidv4 } from 'uuid';

const DEVICE_KEY = 'device_id';

export function getDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = uuidv4();
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return 'web-' + Math.random().toString(36).slice(2);
  }
}
