import { Separator } from "../../ui/separator"

export default function UserSettings() {
    return (
        <div className="flex-1 space-y-6 p-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            </div>

            <div className="grid gap-6">
                {/* Appearance Settings */}
                <div className="space-y-4 rounded-lg border p-6">
                    <div>
                        <h2 className="text-xl font-semibold">Appearance</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            Customize the look and feel of your application
                        </p>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Theme
                                </label>
                                <div className="text-sm text-muted-foreground">
                                    Choose your preferred theme
                                </div>
                            </div>
                            <select className="flex h-10 w-[180px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                                <option value="system">System</option>
                                <option value="light">Light</option>
                                <option value="dark">Dark</option>
                            </select>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Compact Mode
                                </label>
                                <div className="text-sm text-muted-foreground">
                                    Use a more compact interface layout
                                </div>
                            </div>
                            <input
                                type="checkbox"
                                className="peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            />
                        </div>
                    </div>
                </div>

                {/* Chat Settings */}
                <div className="space-y-4 rounded-lg border p-6">
                    <div>
                        <h2 className="text-xl font-semibold">Chat Preferences</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            Configure your chat experience
                        </p>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Auto-scroll
                                </label>
                                <div className="text-sm text-muted-foreground">
                                    Automatically scroll to new messages
                                </div>
                            </div>
                            <input
                                type="checkbox"
                                defaultChecked
                                className="peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Typing Indicators
                                </label>
                                <div className="text-sm text-muted-foreground">
                                    Show when the AI is typing
                                </div>
                            </div>
                            <input
                                type="checkbox"
                                defaultChecked
                                className="peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Message Sounds
                                </label>
                                <div className="text-sm text-muted-foreground">
                                    Play sound for new messages
                                </div>
                            </div>
                            <input
                                type="checkbox"
                                className="peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            />
                        </div>
                    </div>
                </div>

                {/* Privacy Settings */}
                <div className="space-y-4 rounded-lg border p-6">
                    <div>
                        <h2 className="text-xl font-semibold">Privacy</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            Manage your privacy and data preferences
                        </p>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Save Chat History
                                </label>
                                <div className="text-sm text-muted-foreground">
                                    Store your conversations locally
                                </div>
                            </div>
                            <input
                                type="checkbox"
                                defaultChecked
                                className="peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Analytics
                                </label>
                                <div className="text-sm text-muted-foreground">
                                    Help improve the app with usage data
                                </div>
                            </div>
                            <input
                                type="checkbox"
                                className="peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
