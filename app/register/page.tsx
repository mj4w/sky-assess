/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { User, Lock, Mail, Loader2, Plane, Eye, EyeOff, ArrowLeft, ShieldCheck, AlertCircle } from "lucide-react";
import DataPrivacyGate from "@/components/data-privacy-gate";
import Link from "next/link";

// --- MINIMALIST REUSABLE INPUT ---
const FormInput = ({ label, icon: Icon, ...props }: any) => (
  <div className="space-y-1.5">
    <Label className="font-semibold uppercase text-[10px] tracking-widest text-slate-500">{label}</Label>
    <div className="relative group">
      <Icon className="absolute left-3 top-3.5 h-4 w-4 text-slate-400 group-focus-within:text-blue-900 transition-colors" />
      <input 
        {...props}
        className="w-full h-11 pl-10 pr-4 border border-slate-200 focus:outline-none focus:border-blue-900 focus:ring-4 focus:ring-blue-900/5 transition-all bg-white text-sm rounded-md"
      />
    </div>
  </div>
);

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [showAdvisory, setShowAdvisory] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    personnelId: '',
    password: '',
    role: 'student' as 'student' | 'instructor'
  });
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
    if (error) setError(null);
  };

  const getValidationSpec = (role: "student" | "instructor") => {
    const isInstructor = role === "instructor"
    return {
      isInstructor,
      validationTable: isInstructor ? "instructor_info" : "student_info",
      validationColumn: isInstructor ? "instructor_id" : "student_id",
      label: isInstructor ? "Instructor ID" : "Student ID",
    }
  }

  const validatePersonnelId = async (role: "student" | "instructor", personnelIdRaw: string) => {
    const { validationTable, validationColumn, label } = getValidationSpec(role)
    // console.log(validationTable)
    const candidates = [...new Set([personnelIdRaw, personnelIdRaw.toUpperCase(), personnelIdRaw.toLowerCase()])]
    // console.log(candidates)
    const { data: approvedRows, error: approvedError } = await supabase
      .from(validationTable)
      .select(validationColumn)
      .in(validationColumn, candidates)
      .limit(1)
    // console.log(data)
    if (approvedError) throw approvedError
    if (!approvedRows || approvedRows.length === 0) {
      throw new Error(`${label} not found. Please contact admin to be added before registering.`)
    }
    // console.log(validationTable)
    const { data: claimedRows, error: claimedError } = await supabase
      .from("profiles")
      .select("id")
      .in(validationColumn, candidates)
      .limit(1)
    console.log(claimedRows)
    if (claimedError) throw claimedError
    if (claimedRows && claimedRows.length > 0) {
      throw new Error("This ID is already registered. Please login instead.")
    }
  }

  const handleRegisterAttempt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (!formData.personnelId.trim()) {
      setError(formData.role === "instructor" ? "Instructor ID is required." : "Student ID is required.");
      return;
    }

    const personnelIdRaw = formData.personnelId.trim()

    setLoading(true)
    setError(null)
    try {
      await validatePersonnelId(formData.role, personnelIdRaw)
      setShowAdvisory(true);
    } catch (err: any) {
      setShowAdvisory(false)
      setError(err?.message || "Unable to validate ID. Please try again.")
    } finally {
      setLoading(false)
    }
  };

  const finalizeRegistration = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const email = formData.email.trim().toLowerCase();
      const personnelIdRaw = formData.personnelId.trim();
      const personnelId = personnelIdRaw.toUpperCase();

      // Must be pre-approved + unclaimed before creating auth user.
      await validatePersonnelId(formData.role, personnelIdRaw)

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: formData.password,
      });

      if (authError) throw authError;

      if (authData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{ 
            id: authData.user.id, 
            email,
            role: formData.role,
            instructor_id: formData.role === 'instructor' ? personnelId : null,
            student_id: formData.role === 'student' ? personnelId : null,
          }]);
        if (profileError) throw profileError;
      }
      window.location.href = '/login?registered=true';
    } catch (err: any) {
      const message = err?.message || "Registration failed."
      const code = err?.code ? ` [code: ${err.code}]` : ""
      const status = typeof err?.status === "number" ? ` [status: ${err.status}]` : ""
      const fullMessage = `${message}${code}${status}`

      console.error("Signup error details:", err)

      if (typeof message === "string" && message.toLowerCase().includes("captcha")) {
        setError("Sign up blocked by Captcha settings in Supabase. Disable Captcha in Auth settings or send a captcha token from the frontend.");
      } else if (typeof message === "string" && message.toLowerCase().includes("database error")) {
        setError(`Supabase Auth DB trigger/policy failed during signup.${code}${status} Check Supabase Auth logs for the exact SQL error.`)
      } else {
        setError(fullMessage);
      }
      setShowAdvisory(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-white font-sans overflow-hidden">
      
      {/* LEFT SIDE: BANNER (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-5/12 bg-[#1E3A8A] relative items-center justify-center p-12 overflow-hidden border-r border-slate-100">
        {/* Abstract Background Design */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-800/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-red-600/10 rounded-full blur-3xl" />
        
        <div className="relative z-10 space-y-8">
          <Link href="/login" className="inline-flex items-center gap-2 text-white/60 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors mb-4">
            <ArrowLeft size={14} /> Back to Login
          </Link>
          
          <div className="space-y-4">
            <div className="bg-red-600 w-12 h-12 flex items-center justify-center rounded-lg shadow-lg mb-6">
              <Plane className="text-white size-6 -rotate-45" />
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight leading-tight uppercase">
              Begin Your <br />
              <span className="text-red-500">Flight Journey.</span>
            </h1>
            <p className="text-blue-100/60 text-sm font-medium max-w-sm leading-relaxed">
              Create your official account to access flight assessments, performance tracking, and training records.
            </p>
          </div>

          {/* <div className="pt-8 border-t border-white/10 flex items-center gap-4">
            <div className="flex -space-x-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-[#1E3A8A] bg-slate-200" />
              ))}
            </div>
            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Joined by 500+ Cadets</p>
          </div> */}
        </div>
      </div>

      {/* RIGHT SIDE: REGISTRATION FORM */}
      <div className="w-full lg:w-7/12 flex items-center justify-center p-8 lg:p-16 bg-slate-50/20 overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, x: 20 }} 
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md space-y-8 py-8"
        >
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Personnel Enlistment</h2>
            <p className="text-slate-500 text-sm">Register your credentials for WCC SkyAssess.</p>
          </div>
          
          {error && (
            <div className="bg-red-50 border border-red-100 p-4 rounded-lg flex items-center gap-3 text-red-600 text-xs font-semibold">
              <AlertCircle className="size-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleRegisterAttempt} className="space-y-6">
            {/* Minimalist Role Selection */}
            <div className="space-y-3">
              <Label className="font-semibold uppercase text-[10px] tracking-widest text-slate-500">Select Rank</Label>
              <div className="grid grid-cols-2 gap-3">
                {(['student', 'instructor'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, role: r }))}
                    className={`h-12 flex items-center justify-center gap-2 rounded-md border text-[11px] font-bold uppercase tracking-widest transition-all ${
                      formData.role === r 
                        ? 'bg-[#1E3A8A] border-[#1E3A8A] text-white shadow-lg shadow-blue-900/20' 
                        : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <User size={14} />
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <FormInput id="email" label="Aviation Email" icon={Mail} type="email" placeholder="sample@email.com" required onChange={handleInputChange} />
              <FormInput
                id="personnelId"
                label={formData.role === "instructor" ? "Instructor ID" : "Student ID"}
                icon={User}
                type="text"
                placeholder={formData.role === "instructor" ? "INST-001" : "STD-001"}
                required
                onChange={handleInputChange}
              />

              <div className="space-y-1.5">
                <Label className="font-semibold uppercase text-[10px] tracking-widest text-slate-500">Security Password</Label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-3.5 h-4 w-4 text-slate-400 group-focus-within:text-blue-900 transition-colors" />
                  <input 
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••" 
                    className="w-full h-11 pl-10 pr-10 border border-slate-200 focus:outline-none focus:border-blue-900 focus:ring-4 focus:ring-blue-900/5 transition-all bg-white text-sm rounded-md"
                    required 
                    onChange={handleInputChange}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-slate-400 hover:text-blue-900"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <Button 
              disabled={loading}
              type="submit" 
              className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-widest text-xs transition-all rounded-md shadow-xl shadow-red-600/10 active:scale-[0.98]"
            >
              {loading ? <Loader2 className="animate-spin" /> : "Request Flight Clearance"}
            </Button>
          </form>

          <div className="pt-6 border-t border-slate-100 flex flex-col items-center gap-4 text-center">
             <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
               <ShieldCheck size={14} className="text-green-600" /> RA 10173 Secured Data Environment
             </div>
             <p className="text-sm text-slate-500">
               Already have access? <Link href="/login" className="text-blue-900 font-bold hover:underline underline-offset-4">Log in here</Link>
             </p>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {showAdvisory && (
          <DataPrivacyGate onAccept={finalizeRegistration} loading={loading} />
        )}
      </AnimatePresence>
    </div>
  );
}
