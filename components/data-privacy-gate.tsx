"use client"

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowRight, ShieldCheck, Lock } from "lucide-react";
import { motion } from 'framer-motion';
import SkyAssessLogo from "./SkyAssessLogo";

interface DataPrivacyGateProps {
  onAccept: () => void | Promise<void>
  loading?: boolean
}

export default function DataPrivacyGate({ onAccept, loading = false }: DataPrivacyGateProps) {
  const [hasAccepted, setHasAccepted] = useState(false);

  return (
    <div className="fixed inset-0 z-150 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg"
      >
        <Card className="border-none shadow-2xl bg-white overflow-hidden rounded-3xl">
          
          <CardHeader className="flex flex-col items-center pb-6 pt-8 bg-white text-center">
            <div className="bg-blue-50 p-4 rounded-2xl mb-4">
              <ShieldCheck className="h-8 w-8 text-blue-900" />
            </div>
            
            <div className="space-y-1">
              <h2 className="text-2xl font-black italic uppercase text-slate-900 tracking-tight">
                Data Privacy Advisory
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                WCC Aeronautical & Technological College
              </p>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6 px-8 text-slate-600">
            <p className="text-sm leading-relaxed text-center font-medium">
              By proceeding with registration, you acknowledge and agree that your personal information will be processed in accordance with the 
              <a 
                href='https://privacy.gov.ph/data-privacy-act/' 
                target="_blank" 
                rel="noreferrer"
                className="mx-1 font-bold text-blue-900 underline underline-offset-4 hover:text-blue-700 transition-colors"
              >
                Data Privacy Act of 2012 (RA 10173)
              </a>.
            </p>

            {/* Info Box - Now Minimalist Blue */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex gap-4 transition-all hover:border-blue-100">
              <Lock className="h-5 w-5 text-blue-900 shrink-0 mt-0.5" />
              <div className="space-y-1">
                  <p className="text-xs font-black uppercase text-slate-900 tracking-wide">Secure Data Handling</p>
                  <p className="text-[11px] leading-relaxed text-slate-500 font-medium">
                    Your data is encrypted and used solely for account authentication and flight assessment records. We maintain strict confidentiality protocols.
                  </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 pt-4 px-2">
              <Checkbox 
                id="terms" 
                checked={hasAccepted} 
                onCheckedChange={(checked) => setHasAccepted(checked === true)}
                className="mt-1 border-slate-300 h-5 w-5 rounded-md data-[state=checked]:bg-blue-900 data-[state=checked]:border-blue-900 transition-all"
              />
              <label
                htmlFor="terms"
                className="text-xs font-bold leading-tight text-slate-700 cursor-pointer select-none"
              >
                I have read and understood the terms regarding the collection and processing of my personal flight data.
              </label>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4 pb-10 pt-6 px-8">
            <Button 
              disabled={!hasAccepted || loading}
              onClick={onAccept}
              className={`w-full h-14 rounded-2xl font-black uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/10 
                ${hasAccepted && !loading
                  ? 'bg-blue-900 hover:bg-slate-900 text-white' 
                  : 'bg-slate-100 text-slate-400 border border-slate-200 shadow-none'
                }`}
            >
              {loading ? "Processing..." : "Confirm & Start Session"} <ArrowRight className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center justify-center gap-2 opacity-40">
              <SkyAssessLogo className="h-4 w-4" />
              <span className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em]">
                SkyAssess
              </span>
            </div>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
