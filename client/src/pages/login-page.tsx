import { LoginForm } from '@/components/login-form'

export function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
      <LoginForm className="w-full max-w-md" />
    </div>
  )
}
