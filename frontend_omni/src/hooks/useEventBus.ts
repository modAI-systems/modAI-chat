import { useEffect, useRef } from 'react'
import { eventBus, type EventCallback } from '../services/eventBus'

/**
 * React hook for subscribing to events from the event bus
 * @param eventName The name of the event to listen for
 * @param callback The callback function to execute when the event is emitted
 */
export function useEventBus<T = unknown>(
    eventName: string,
    callback: EventCallback<T>
): void {
    const callbackRef = useRef(callback)
    callbackRef.current = callback

    useEffect(() => {
        const unsubscribe = eventBus.on(eventName, (data) => {
            callbackRef.current(data as T)
        })

        return unsubscribe
    }, [eventName])
}

/**
 * React hook for emitting events to the event bus
 * @returns A function to emit events
 */
export function useEventEmitter() {
    return <T = unknown>(eventName: string, data: T) => {
        eventBus.emit(eventName, data)
    }
}
