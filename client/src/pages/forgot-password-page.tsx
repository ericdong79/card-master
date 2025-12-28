import { ForgotPasswordForm } from '@/components/forgot-password-form'

export function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
      <ForgotPasswordForm className="w-full max-w-md" />
    </div>
  )
}
