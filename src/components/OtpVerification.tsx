import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Phone, RefreshCw, Shield, CheckCircle } from 'lucide-react';

interface OtpVerificationProps {
  userId: string;
  email: string;
  phone?: string;
  onVerified: () => void;
  onSkip?: () => void;
}

type OtpChannel = 'email' | 'sms' | 'both';

export const OtpVerification: React.FC<OtpVerificationProps> = ({
  userId,
  email,
  phone,
  onVerified,
  onSkip,
}) => {
  const [otp, setOtp] = useState('');
  const [channel, setChannel] = useState<OtpChannel>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [remainingAttempts, setRemainingAttempts] = useState(3);
  const { toast } = useToast();

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const sendOtp = async () => {
    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: {
          userId,
          channel,
          email,
          phone,
        },
      });

      if (error) throw error;

      if (data.success) {
        setOtpSent(true);
        setCountdown(60); // 60 second cooldown
        setRemainingAttempts(3);
        toast({
          title: 'OTP Sent',
          description: `Verification code sent via ${channel === 'both' ? 'email and SMS' : channel}.`,
        });
      } else {
        throw new Error(data.error || 'Failed to send OTP');
      }
    } catch (error: any) {
      console.error('Send OTP error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send OTP. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const verifyOtp = async () => {
    if (otp.length !== 6) {
      toast({
        title: 'Invalid OTP',
        description: 'Please enter a 6-digit code.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: {
          userId,
          otp,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: 'Verified!',
          description: 'Your identity has been verified successfully.',
        });
        onVerified();
      } else {
        if (data.remainingAttempts !== undefined) {
          setRemainingAttempts(data.remainingAttempts);
        }
        throw new Error(data.error || 'Verification failed');
      }
    } catch (error: any) {
      console.error('Verify OTP error:', error);
      setOtp('');
      toast({
        title: 'Verification Failed',
        description: error.message || 'Invalid OTP. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto border-border/50 shadow-lg">
      <CardHeader className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-2">
          <Shield className="w-8 h-8 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold">OTP Verification</CardTitle>
        <CardDescription>
          Verify your identity to continue voting
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {!otpSent ? (
          <>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                Choose how you'd like to receive your verification code:
              </p>

              <div className="grid gap-2">
                <Button
                  variant={channel === 'email' ? 'default' : 'outline'}
                  className="justify-start h-auto py-3"
                  onClick={() => setChannel('email')}
                >
                  <Mail className="w-5 h-5 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">Email</div>
                    <div className="text-xs text-muted-foreground">{email}</div>
                  </div>
                </Button>

                {phone && (
                  <Button
                    variant={channel === 'sms' ? 'default' : 'outline'}
                    className="justify-start h-auto py-3"
                    onClick={() => setChannel('sms')}
                  >
                    <Phone className="w-5 h-5 mr-3" />
                    <div className="text-left">
                      <div className="font-medium">SMS</div>
                      <div className="text-xs text-muted-foreground">{phone}</div>
                    </div>
                  </Button>
                )}

                {phone && (
                  <Button
                    variant={channel === 'both' ? 'default' : 'outline'}
                    className="justify-start h-auto py-3"
                    onClick={() => setChannel('both')}
                  >
                    <div className="flex items-center">
                      <Mail className="w-4 h-4 mr-1" />
                      <Phone className="w-4 h-4 mr-3" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">Both Email & SMS</div>
                      <div className="text-xs text-muted-foreground">Maximum security</div>
                    </div>
                  </Button>
                )}
              </div>
            </div>

            <Button
              className="w-full"
              onClick={sendOtp}
              disabled={isSending}
            >
              {isSending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Verification Code'
              )}
            </Button>
          </>
        ) : (
          <>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Enter the 6-digit code sent to your {channel === 'both' ? 'email and phone' : channel}
              </p>

              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={setOtp}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                {remainingAttempts} attempts remaining
              </p>
            </div>

            <div className="space-y-3">
              <Button
                className="w-full"
                onClick={verifyOtp}
                disabled={isLoading || otp.length !== 6}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Verify Code
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={sendOtp}
                disabled={countdown > 0 || isSending}
              >
                {countdown > 0 ? (
                  `Resend in ${countdown}s`
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Resend Code
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {onSkip && (
          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={onSkip}
          >
            Skip for now
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
