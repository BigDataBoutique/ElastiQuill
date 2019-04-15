import { EventEmitter } from 'events';

const eventEmitter = new EventEmitter();

export function emitCreate(type, value) {
  eventEmitter.emit('create-' + type, value);
}
export function emitChange(type, value) {
  eventEmitter.emit('change-' + type, value);
}

export function onChange(type, cb) {
  eventEmitter.on('change-' + type, cb);
}