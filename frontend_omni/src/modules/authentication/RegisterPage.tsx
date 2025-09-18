import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuthService } from "@/moduleif/authenticationService"
import LoginRegisterForm from "./LoginRegisterForm"

export default function RegisterPage() {
    return (
        <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
            <div className="w-full max-w-sm">
                <Register />
            </div>
        </div>
    )
}

export function Register() {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const navigate = useNavigate()
    const authService = useAuthService()

    const handleSubmit = async ({ email, password, fullName }: { email: string; password: string; fullName: string }) => {
        setIsLoading(true)
        setError(null)

        try {
            await authService.signup({
                email,
                password,
                full_name: fullName.trim() || undefined
            })
            navigate("/login")
        } catch (err) {
            setError(err instanceof Error ? err.message : "Registration failed")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <LoginRegisterForm.Provider onSubmit={handleSubmit} isLoading={isLoading} error={error}>
            <LoginRegisterForm>
                <LoginRegisterForm.RegisterHeader />
                <LoginRegisterForm.Content>
                    <LoginRegisterForm.ErrorMessage />
                    <LoginRegisterForm.FullName />
                    <LoginRegisterForm.Email />
                    <LoginRegisterForm.Password variant="register" />
                    <LoginRegisterForm.CreateAccountButton />
                </LoginRegisterForm.Content>
                <LoginRegisterForm.RegisterHint />
            </LoginRegisterForm>
        </LoginRegisterForm.Provider>
    )
}
