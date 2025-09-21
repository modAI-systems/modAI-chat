import { cn } from "@/shadcn/lib/utils"
import { Button } from "@/shadcn/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/shadcn/components/ui/card"
import { Input } from "@/shadcn/components/ui/input"
import { Label } from "@/shadcn/components/ui/label"
import { useState, createContext, useContext } from "react"
import { Link } from "react-router-dom"

// Context for shared form state and handlers
interface FormContextType {
    email: string
    setEmail: (email: string) => void
    password: string
    setPassword: (password: string) => void
    fullName: string
    setFullName: (fullName: string) => void
    isLoading: boolean
    error: string | null
    onSubmit: (e: React.FormEvent) => void
}

const FormContext = createContext<FormContextType | undefined>(undefined)

function useFormContext() {
    const context = useContext(FormContext)
    if (!context) {
        throw new Error('LoginRegisterForm subcomponents must be used within LoginRegisterForm.Provider')
    }
    return context
}

// Main compound component
function LoginRegisterForm({ children, className, ...props }: React.ComponentPropsWithoutRef<"div">) {
    const { onSubmit } = useFormContext()

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card>
                <form onSubmit={onSubmit}>
                    {children}
                </form>
            </Card>
        </div>
    )
}

// Provider for form state
function Provider({
    children,
    onSubmit,
    isLoading = false,
    error = null
}: {
    children: React.ReactNode
    onSubmit: (formData: { email: string; password: string; fullName: string }) => Promise<void>
    isLoading?: boolean
    error?: string | null
}) {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [fullName, setFullName] = useState("")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        await onSubmit({ email, password, fullName })
    }

    const value: FormContextType = {
        email,
        setEmail,
        password,
        setPassword,
        fullName,
        setFullName,
        isLoading,
        error,
        onSubmit: handleSubmit
    }

    return (
        <FormContext value={value}>
            {children}
        </FormContext>
    )
}

// Header components
function LoginHeader() {
    return (
        <CardHeader>
            <CardTitle className="text-2xl">Login</CardTitle>
            <CardDescription>
                Enter your email below to login to your account
            </CardDescription>
        </CardHeader>
    )
}

function RegisterHeader() {
    return (
        <CardHeader>
            <CardTitle className="text-2xl">Sign Up</CardTitle>
            <CardDescription>
                Create a new account to get started
            </CardDescription>
        </CardHeader>
    )
}

// Input components
function Email() {
    const { email, setEmail, isLoading } = useFormContext()

    return (
        <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="m@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
            />
        </div>
    )
}

function Password({ variant = "login" }: { variant?: "login" | "register" }) {
    const { password, setPassword, isLoading } = useFormContext()

    return (
        <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
                id="password"
                type="password"
                autoComplete={variant === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
            />
        </div>
    )
}

function FullName() {
    const { fullName, setFullName, isLoading } = useFormContext()

    return (
        <div className="grid gap-2">
            <Label htmlFor="fullName">Full Name (Optional)</Label>
            <Input
                id="fullName"
                type="text"
                autoComplete="name"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={isLoading}
            />
        </div>
    )
}

// Button components
function LoginButton() {
    const { isLoading } = useFormContext()

    return (
        <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Logging in..." : "Login"}
        </Button>
    )
}

function CreateAccountButton() {
    const { isLoading } = useFormContext()

    return (
        <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Creating account..." : "Create Account"}
        </Button>
    )
}

// Utility components
function ErrorMessage() {
    const { error } = useFormContext()

    if (!error) return null

    return (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded border">
            {error}
        </div>
    )
}

function ForgotPasswordLink() {
    return (
        <a
            href="#"
            className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
        >
            Forgot your password?
        </a>
    )
}

function LoginHint() {
    return (
        <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link to="/register" className="underline underline-offset-4">
                Sign up
            </Link>
        </div>
    )
}

function RegisterHint() {
    return (
        <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link to="/login" className="underline underline-offset-4">
                Sign in
            </Link>
        </div>
    )
}

// Form content wrapper
function Content({ children }: { children: React.ReactNode }) {
    return (
        <CardContent className="pt-8">
            <div className="flex flex-col gap-6">
                {children}
            </div>
        </CardContent>
    )
}

// Password field wrapper for login (includes forgot password link)
function PasswordWithForgot({ enableForgetPassword = true }: { enableForgetPassword?: boolean }) {
    const { password, setPassword, isLoading } = useFormContext()

    return (
        <div className="grid gap-2">
            <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
                {enableForgetPassword && <ForgotPasswordLink />}
            </div>
            <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
            />
        </div>
    )
}

// Attach subcomponents to main component
LoginRegisterForm.Provider = Provider
LoginRegisterForm.LoginHeader = LoginHeader
LoginRegisterForm.RegisterHeader = RegisterHeader
LoginRegisterForm.Content = Content
LoginRegisterForm.Email = Email
LoginRegisterForm.Password = Password
LoginRegisterForm.PasswordWithForgot = PasswordWithForgot
LoginRegisterForm.FullName = FullName
LoginRegisterForm.LoginButton = LoginButton
LoginRegisterForm.CreateAccountButton = CreateAccountButton
LoginRegisterForm.ErrorMessage = ErrorMessage
LoginRegisterForm.ForgotPasswordLink = ForgotPasswordLink
LoginRegisterForm.LoginHint = LoginHint
LoginRegisterForm.RegisterHint = RegisterHint

export default LoginRegisterForm
