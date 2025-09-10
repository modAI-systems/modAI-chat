import { moduleManager } from '../services/moduleManager'

// Import built-in modules
import { createModule as createChatModule } from '../components/modules/chat/Module'
import { createModule as createUserSettingsModule } from '../components/modules/userSettings/Module'
import { createModule as createUserProfileItemModule } from '../components/modules/userProfileItem/Module'


export function registerBuiltInModules() {
    const allModules = [createChatModule(), createUserSettingsModule(), createUserProfileItemModule()]

    allModules.forEach(module => {
        moduleManager.registerModule(module)
    })
}
