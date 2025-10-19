import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "@/modules/session-provider";
import { LoginRegisterForm } from "./LoginRegisterForm";
import { useAuthService } from "@/modules/authentication-service";

interface LoginProps {
    enableForgetPassword?: boolean;
}

export function LoginPage() {
    return (
        <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
            <div className="w-full max-w-sm">
                <Login enableForgetPassword={false} />
            </div>
        </div>
    );
}

function Login({ enableForgetPassword = true }: LoginProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const { refreshSession } = useSession();
    const authService = useAuthService();

    const handleSubmit = async ({
        email,
        password,
    }: {
        email: string;
        password: string;
        fullName: string;
    }) => {
        setIsLoading(true);
        setError(null);

        try {
            await authService.login({ email, password });
            await refreshSession();
            navigate("/");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Login failed");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <LoginRegisterForm.Provider
            onSubmit={handleSubmit}
            isLoading={isLoading}
            error={error}
        >
            <LoginRegisterForm>
                <LoginRegisterForm.LoginHeader />
                <LoginRegisterForm.Content>
                    <LoginRegisterForm.ErrorMessage />
                    <LoginRegisterForm.Email />
                    <LoginRegisterForm.PasswordWithForgot
                        enableForgetPassword={enableForgetPassword}
                    />
                    <LoginRegisterForm.LoginButton />
                </LoginRegisterForm.Content>
                <LoginRegisterForm.LoginHint />
            </LoginRegisterForm>
        </LoginRegisterForm.Provider>
    );
}
