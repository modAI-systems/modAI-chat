type EventCallback<T = unknown> = (data: T) => void

interface EventMap {
    [eventName: string]: unknown
}

class EventBus<T extends Record<string, unknown> = EventMap> {
    private listeners: Map<string, Set<EventCallback<unknown>>> = new Map()

    /**
     * Subscribe to an event
     * @param eventName The name of the event to listen for
     * @param callback The callback function to execute when the event is emitted
     * @returns A function to unsubscribe from the event
     */
    on<K extends keyof T & string>(eventName: K, callback: EventCallback<T[K]>): () => void {
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, new Set())
        }

        const eventListeners = this.listeners.get(eventName)!
        eventListeners.add(callback as EventCallback<unknown>)

        // Return unsubscribe function
        return () => {
            eventListeners.delete(callback as EventCallback<unknown>)
            if (eventListeners.size === 0) {
                this.listeners.delete(eventName)
            }
        }
    }

    /**
     * Emit an event to all subscribers
     * @param eventName The name of the event to emit
     * @param data The data to pass to the event listeners
     */
    emit<K extends keyof T & string>(eventName: K, data: T[K]): void {
        const eventListeners = this.listeners.get(eventName)
        if (eventListeners) {
            eventListeners.forEach(callback => {
                try {
                    callback(data)
                } catch (error) {
                    console.error(`Error in event listener for "${eventName}":`, error)
                }
            })
        }
    }

    /**
     * Remove all listeners for a specific event
     * @param eventName The name of the event to clear listeners for
     */
    off<K extends keyof T & string>(eventName: K): void {
        this.listeners.delete(eventName)
    }

    /**
     * Remove all listeners for all events
     */
    clear(): void {
        this.listeners.clear()
    }
}

// Create a global event bus instance
export const eventBus = new EventBus()

// Export the EventBus class for creating custom instances
export { EventBus }
export type { EventCallback, EventMap }
