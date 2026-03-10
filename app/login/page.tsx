/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { User, Lock, Plane, ShieldCheck,Loader2, AlertCircle, CheckCircle2, Eye, EyeOff, ArrowRight } from "lucide-react";
import Link from "next/link";

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

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [formData, setFormData] = useState({ loginId: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (searchParams.get('expired') === 'true') setError("Session expired. Please login again.");
    if (searchParams.get('registered') === 'true') setSuccessMsg("Registered Successful! Access your flight deck below.");
    
  }, [searchParams]);

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
          // console.log("⚠️ No Instructor match. Falling back to Student ID check...");
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

  return (
    <div className="min-h-screen w-full flex bg-white font-sans overflow-hidden">
      
      {/* LEFT SIDE: BANNER (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#1E3A8A] relative items-center justify-center p-12 overflow-hidden">
        {/* Abstract Background Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-red-600/10 rounded-full -ml-48 -mb-48" />
        
        <div className="relative z-10 space-y-6 text-center lg:text-left">
          <motion.div 
            initial={{ opacity: 0, x: -20 }} 
            animate={{ opacity: 1, x: 0 }}
            className="inline-flex items-center gap-2 bg-red-600 px-4 py-2 rounded-lg shadow-lg"
          >
            <Plane className="text-white size-6" />
            <span className="text-white font-bold tracking-tighter italic">SKYASSESS</span>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.2 }}
            className="space-y-2"
          >
            <h1 className="text-5xl font-black text-white tracking-tight leading-tight">
              ADVANCING <br /> 
              <span className="text-red-500">AVIATION</span> TRAINING.
            </h1>
            <p className="text-blue-100/70 text-lg font-medium max-w-md">
              The premier aeronautical assessment platform for WCC Aeronautical and Technological College.
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
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Personnel Login</h2>
            <p className="text-slate-500 text-sm">Enter your credentials to access the flight operations deck.</p>
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
                  Forgot Secret?
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
