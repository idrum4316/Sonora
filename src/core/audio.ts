// Singleton audio element — lives outside React lifecycle
export const audio = new Audio();
audio.preload = 'metadata';
