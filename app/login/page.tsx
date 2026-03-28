/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import React, { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import ForceLightMode from "@/components/ForceLightMode";
import { User, Lock,ShieldCheck,Loader2, AlertCircle, CheckCircle2, Eye, EyeOff, ArrowRight } from "lucide-react";
import Link from "next/link";
import SkyAssessLogo from '@/components/SkyAssessLogo';

const FormInput = ({ label, icon: Icon, rightElement, ...props }: any) => (
  <div className="space-y-1.5">
    <Label className="font-semibold uppercase text-[10px] tracking-widest text-slate-500">{label}</Label>
    <div className="relative group">
      <Icon className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-blue-900 transition-colors" />
      <input 
        {...props}
        className="w-full h-11 pl-10 pr-10 border border-slate-200 focus:outline-none focus:border-blue-900 focus:ring-4 focus:ring-blue-900/5 transition-all bg-white text-sm rounded-md"
      />
      {rightElement && (
        <div className="absolute right-3 top-3">
          {rightElement}
        </div>
      )}
    </div>
  </div>
);

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [formData, setFormData] = useState({ loginId: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (searchParams.get('expired') === 'true') setError("Session expired. Please login again.");
    if (searchParams.get('registered') === 'true') setSuccessMsg("Registered Successful! Access your flight deck below.");
    if (searchParams.get('oauth_error')) setError(searchParams.get('oauth_error'));
    
  }, [searchParams]);

  useEffect(() => {
    const resolveExistingSession = async () => {
      const { data: authData } = await supabase.auth.getUser()
      const user = authData.user
      if (!user) return

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, student_id, instructor_id")
        .eq("id", user.id)
        .maybeSingle()

      const role = String(profile?.role || "").toLowerCase()
      const hasStructuredProfile =
        (role === "student" && Boolean(String(profile?.student_id || "").trim())) ||
        (role === "instructor" && Boolean(String(profile?.instructor_id || "").trim())) ||
        role === "admin" ||
        role === "flightops"

      if (!profile || !hasStructuredProfile) {
        const onboardingUrl = nextUrl
          ? `/auth/google-onboarding?next=${encodeURIComponent(nextUrl)}`
          : "/auth/google-onboarding"
        router.replace(onboardingUrl)
        return
      }

      if (nextUrl && nextUrl.startsWith("/")) {
        router.replace(nextUrl)
        return
      }

      if (role === "admin") {
        router.replace("/dashboard/admin")
        return
      }

      if (role === "flightops") {
        router.replace("/flight-ops")
        return
      }

      router.replace(`/dashboard/${role || "student"}/${user.id}`)
    }

    void resolveExistingSession()
  }, [nextUrl, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
    if (error) setError(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      let emailToLogin = formData.loginId.trim();
      // const { data: allProfiles, error: debugError } = await supabase
      //   .from("profiles")
      //   .select("*");
        
      // console.group("🚨 DATABASE SNAPSHOT ", allProfiles);
      if (!emailToLogin.includes("@")) {
        const normalizedId = emailToLogin.trim().toLowerCase();
        const idCandidates = [normalizedId];
        
        // console.log("🔍 Starting ID Resolution for:", rawId);
        // console.log("📋 Testing Candidates:", idCandidates);

        let resolvedEmail: string | null = null;

        // Instructor ID first
        for (const candidate of idCandidates) {
          // console.log(`📡 Querying Instructor ID: "${candidate}"`);
          
          const { data: instructorRows, error: instructorError } = await supabase
            .from("profiles")
            .select("email, instructor_id, student_id")
            .ilike("instructor_id", candidate)
            .limit(1);

          if (instructorError) {
            // console.error("❌ Supabase Error (Instructor Query):", instructorError);
            throw instructorError;
          }

          if (instructorRows && instructorRows.length > 0) {
            // console.log("✅ Match Found in Instructor Table:", instructorRows[0]);
            resolvedEmail = instructorRows[0].email;
            break;
          } else {
            // console.log(`--- No match for Instructor ID: "${candidate}"`);
          }
        }

        // Student fallback
        if (!resolvedEmail) {
          // console.log(" No Instructor match. Falling back to Student ID check...");
          for (const candidate of idCandidates) {
            const { data: studentRows, error: studentError } = await supabase
              .from("profiles")
              .select("email")
              .ilike("student_id", candidate)
              .limit(1);

            if (studentError) throw studentError;
            if (studentRows && studentRows.length > 0) {
              // console.log("✅ Match Found in Student Table:", studentRows[0]);
              resolvedEmail = studentRows[0].email;
              break;
            }
          }
        }

        if (!resolvedEmail) {
          // console.error("❌ Resolution Failed: No profile found for input:", rawId);
          throw new Error("ID not found. Try your email instead.");
        }

        emailToLogin = resolvedEmail;
        // console.log("📧 Final Email for Auth:", emailToLogin);
      }

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: emailToLogin.toLowerCase(),
        password: formData.password,
      });

      if (authError) {
        // console.error("❌ Auth Error:", authError.message);
        throw authError;
      }
      
      if (data.user) {
        if (nextUrl && nextUrl.startsWith("/")) {
          router.push(nextUrl);
          return;
        }
        // console.log("🎉 Login Successful for User ID:", data.user.id);
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
        if (profile?.role === "admin") {
          router.push("/dashboard/admin");
        } else if (profile?.role === "flightops") {
          router.push("/flight-ops");
        } else {
          router.push(`/dashboard/${profile?.role}/${data.user.id}`);
        }
      }
    } catch (err: any) {
      setError(err.message || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const currentOrigin = typeof window !== "undefined" ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || "");
      const redirectBase = currentOrigin || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const redirectTo = nextUrl
        ? `${redirectBase}/auth/callback?next=${encodeURIComponent(nextUrl)}`
        : `${redirectBase}/auth/callback`;

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
          },
        },
      });

      if (oauthError) throw oauthError;
    } catch (err: any) {
      setError(err?.message || "Unable to continue with Google.");
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-white font-sans overflow-hidden">
      <ForceLightMode />
      
      {/* LEFT SIDE: BANNER (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#1E3A8A] relative items-center justify-center p-12 overflow-hidden">
        {/* Abstract Background Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-red-600/10 rounded-full -ml-48 -mb-48" />
        
        <div className="relative z-10 space-y-8 text-center lg:text-left">
          <motion.div 
            initial={{ opacity: 0, x: -20 }} 
            animate={{ opacity: 1, x: 0 }}
            className="max-w-md space-y-4"
          >
            <div className="flex flex-col items-center gap-4 lg:flex-row lg:items-center lg:gap-5">
              <SkyAssessLogo className="h-28 w-28 lg:h-32 lg:w-32" />
              <div className="space-y-2">
                <p className="text-[11px] font-black uppercase tracking-[0.34em] text-blue-100/75">SkyAssess</p>
                <p className="text-sm font-black uppercase tracking-[0.24em] text-red-300">WCC Flight Evaluation System</p>
                <div className="mx-auto h-px w-24 bg-linear-to-r from-transparent via-white/60 to-transparent lg:mx-0 lg:w-40" />
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.2 }}
            className="max-w-xl space-y-3"
          >
            <h1 className="text-5xl font-black text-white tracking-tight leading-[0.95] lg:text-6xl">
              ELEVATING <br /> 
              <span className="text-red-500">FLIGHT</span> TRAINING.
            </h1>
            <p className="text-blue-100/72 text-lg font-medium max-w-lg leading-relaxed">
              Secure access to debriefings, performance records, and operational assessments for WCC Aeronautical and Technological College.
            </p>
          </motion.div>
        </div>

        {/* Footer info in Banner */}
        <div className="absolute bottom-8 left-12 flex gap-6 opacity-40 text-white text-[10px] font-bold tracking-widest uppercase">
          <span>RA 10173 COMPLIANT</span>
          <span>© 2026 WCC ATC</span>
        </div>
      </div>

      {/* RIGHT SIDE: FORM */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16 bg-slate-50/30">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md space-y-8"
        >
          <div className="lg:hidden flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <SkyAssessLogo className="h-16 w-16" />
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">SkyAssess</p>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-900">WCC Flight Evaluation System</p>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Flight Deck Access</h2>
            <p className="text-slate-500 text-sm">Sign in to continue to your training, evaluation, and operations workspace.</p>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-100 p-4 rounded-lg flex items-center gap-3 text-red-600 text-xs font-semibold"
              >
                <AlertCircle className="size-4 shrink-0" />
                {error}
              </motion.div>
            )}
            {successMsg && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-green-50 border border-green-100 p-4 rounded-lg flex items-center gap-3 text-green-700 text-xs font-semibold"
              >
                <CheckCircle2 className="size-4 shrink-0" />
                {successMsg}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleLogin} className="space-y-5">
            <FormInput 
              id="loginId" 
              label="Instructor/Student ID or Email" 
              icon={User} 
              type="text" 
              placeholder="Student | Instructor Last Name / email@example.com" 
              required 
              onChange={handleInputChange} 
            />

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label className="font-semibold uppercase text-[10px] tracking-widest text-slate-500">Password</Label>
                <Link href="/forgot-password" title="Forgot Password" className="text-[10px] font-bold text-blue-900 uppercase hover:text-red-600 transition-colors">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative group">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-blue-900 transition-colors" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  required
                  onChange={handleInputChange}
                  className="w-full h-11 pl-10 pr-10 border border-slate-200 focus:outline-none focus:border-blue-900 focus:ring-4 focus:ring-blue-900/5 transition-all bg-white text-sm rounded-md"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-blue-900"
                >
                  {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            <Button 
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-[#1E3A8A] hover:bg-[#162a63] text-white font-bold uppercase tracking-widest text-xs transition-all rounded-md shadow-xl shadow-blue-900/10 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" /> : (
                <>
                  Authorize Entry <ArrowRight size={14} />
                </>
              )}
            </Button>
          </form>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">or</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className="w-full h-12 rounded-md border border-slate-200 bg-white text-slate-700 font-bold uppercase tracking-widest text-xs transition-all hover:border-blue-200 hover:bg-blue-50 flex items-center justify-center gap-3 disabled:opacity-60"
            >
              {googleLoading ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <>
                  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                    <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.3 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12S6.7 21.6 12 21.6c6.9 0 9.1-4.8 9.1-7.2 0-.5 0-.8-.1-1.2H12Z" />
                    <path fill="#34A853" d="M2.4 12c0 5.3 4.3 9.6 9.6 9.6 5.5 0 9.1-3.8 9.1-9.2 0-.6-.1-1.1-.2-1.6H12v3.9h5.5c-.3 1.5-1.8 3.3-5.5 3.3-3.3 0-6-2.7-6-6H2.4Z" opacity=".01" />
                    <path fill="#FBBC05" d="M4.6 7.4 7.8 9.7C8.7 7.6 10.2 6 12 6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.3 14.6 2.4 12 2.4 8.3 2.4 5 4.5 3.4 7.6l1.2-.2Z" />
                    <path fill="#4285F4" d="M21.1 10.8H12v3.9h5.5c-.3 1.5-1.8 3.3-5.5 3.3-3.3 0-6-2.7-6-6 0-1 .2-1.9.6-2.8L3.4 7.6A9.6 9.6 0 0 0 2.4 12c0 5.3 4.3 9.6 9.6 9.6 5.5 0 9.1-3.8 9.1-9.2 0-.6-.1-1.1-.2-1.6Z" opacity=".9" />
                  </svg>
                  Continue with Google
                </>
              )}
            </button>
          </div>

          <div className="pt-6 border-t border-slate-100 flex flex-col items-center gap-4">
            <p className="text-sm text-slate-500">
              New personnel? <Link href={nextUrl ? `/register?next=${encodeURIComponent(nextUrl)}` : "/register"} className="text-blue-900 font-bold hover:text-red-600 underline underline-offset-4">Register</Link>
            </p>
            
            <div className="flex gap-6">
              <a href="https://privacy.gov.ph/data-privacy-act/" target='_blank' className="text-[10px] font-bold text-slate-400 hover:text-blue-900 uppercase tracking-widest flex items-center gap-1">
                <ShieldCheck size={12}/> Privacy
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <LoginPageContent />
    </Suspense>
  )
}
