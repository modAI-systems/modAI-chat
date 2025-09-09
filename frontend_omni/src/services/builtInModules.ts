import { moduleManager } from '../services/moduleManager'

// Import built-in modules
import { createModule as createChatModule } from '../components/modules/chat/Module'

export function registerBuiltInModules() {
    const allModules = [createChatModule()]

    allModules.forEach(module => {
        moduleManager.registerModule(module)
    })
}
