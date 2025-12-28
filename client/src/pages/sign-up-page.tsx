import { SignUpForm } from '@/components/sign-up-form'

export function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
      <SignUpForm className="w-full max-w-md" />
    </div>
  )
}
