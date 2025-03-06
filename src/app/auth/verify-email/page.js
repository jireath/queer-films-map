import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';

export default function VerifyEmail() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Check Your Email</CardTitle>
          <CardDescription>
            We've sent you a verification link. Please check your email and click the link to verify your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            If you don't see the email in your inbox, please check your spam folder.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}