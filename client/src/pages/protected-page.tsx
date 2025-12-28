import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Link } from 'react-router-dom'

export function ProtectedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Protected Area</CardTitle>
          <CardDescription>Replace this with your app&apos;s authenticated experience.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            You&apos;re signed in. Add your actual protected routes and data fetching here.
          </p>
          <Button asChild variant="outline">
            <Link to="/login">Back to login</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
