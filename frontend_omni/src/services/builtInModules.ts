import type { ModuleManager } from '../services/moduleManager'

// Import built-in modules
import { createModule as createChatModule } from '../components/modules/chat/Module'
import { createModule as createUserProfileItemModule } from '../components/modules/user-profile-item/Module'
import { createModule as createLoginPageModule } from '../components/modules/login/Module'


export function registerBuiltInModules(moduleManager: ModuleManager) {
    const allModules = [
        createChatModule(),
        createLoginPageModule(),
        createUserProfileItemModule(),
    ]

    allModules.forEach(module => {
        moduleManager.registerModule(module)
        moduleManager.activateModule(module.id)
    })
}
