'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
} from 'firebase/auth'
import { auth } from '@/lib/firebase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'

export default function LoginPage() {
  const [phone, setPhone] = useState('+91')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [loading, setLoading] = useState(false)
  const confirmationRef = useRef<ConfirmationResult | null>(null)
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null)
  const router = useRouter()

  async function sendOTP() {
    setLoading(true)
    try {
      if (!recaptchaRef.current) {
        recaptchaRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
        })
      }
      confirmationRef.current = await signInWithPhoneNumber(
        auth,
        phone,
        recaptchaRef.current
      )
      setStep('otp')
      toast.success('OTP sent', { description: `Code sent to ${phone}` })
    } catch (err) {
      toast.error('Error', { description: String(err) })
    } finally {
      setLoading(false)
    }
  }

  async function verifyOTP() {
    if (!confirmationRef.current) return
    setLoading(true)
    try {
      await confirmationRef.current.confirm(otp)
      router.push('/dashboard')
    } catch (err) {
      toast.error('Invalid OTP', { description: String(err) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">NAGAR</CardTitle>
          <CardDescription>
            {step === 'phone'
              ? 'Enter your mobile number to get started'
              : `Enter the 6-digit code sent to ${phone}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 'phone' ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="phone">Mobile Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <Button onClick={sendOTP} disabled={loading} className="w-full">
                {loading ? 'Sending…' : 'Send OTP'}
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="otp">One-Time Password</Label>
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />
              </div>
              <Button onClick={verifyOTP} disabled={loading || otp.length < 6} className="w-full">
                {loading ? 'Verifying…' : 'Verify & Continue'}
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setStep('phone')}
              >
                Change number
              </Button>
            </>
          )}
          <div id="recaptcha-container" />
        </CardContent>
      </Card>
    </div>
  )
}
