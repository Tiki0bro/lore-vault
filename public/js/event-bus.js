/**
 * LoreEvents - Pub/Sub EventBus for LoreVault SPA
 * Decouples client view components and provides clean event-driven state propagation.
 */
(function() {
  class EventBus {
    constructor() {
      this.listeners = new Map();
    }

    on(event, callback) {
      if (!this.listeners.has(event)) {
        this.listeners.set(event, new Set());
      }
      this.listeners.get(event).add(callback);
    }

    off(event, callback) {
      if (this.listeners.has(event)) {
        this.listeners.get(event).delete(callback);
      }
    }

    emit(event, data) {
      if (this.listeners.has(event)) {
        for (const callback of this.listeners.get(event)) {
          try {
            callback(data);
          } catch (err) {
            console.error(`[EventBus] Error in listener for event '${event}':`, err);
          }
        }
      }
    }
  }

  const globalScope = typeof window !== 'undefined' ? window : global;
  globalScope.LoreEvents = globalScope.LoreEvents || new EventBus();
})();
