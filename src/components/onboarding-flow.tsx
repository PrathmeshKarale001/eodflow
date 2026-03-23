"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoveRight, Sparkles, User, CheckCircle, Clock, FileText, ChevronRight } from "lucide-react";

export function OnboardingFlow() {
  const [step, setStep] = useState(1);
  const router = useRouter();

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      router.push("/overview");
    }
  };

  const handleSkip = () => {
    router.push("/overview");
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-body overflow-hidden selection:bg-primary-container selection:text-white">
      {/* Top Navigation Bar */}
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-6 md:px-10 py-6 md:py-8 bg-background/80 backdrop-blur-md border-b border-white/5">
        <div className="text-xl font-bold tracking-tighter uppercase font-headline">
          EOD <span className="text-primary">Flow</span>
        </div>
        <button 
          onClick={handleSkip}
          className="text-outline hover:text-white transition-colors duration-300 font-label text-sm uppercase tracking-widest"
        >
          Skip
        </button>
      </header>

      {/* Steps Content */}
      <main className="relative min-h-screen flex flex-col items-center justify-center pt-24 pb-12 px-6">
        {step === 1 && <StepOne />}
        {step === 2 && <StepTwo />}
        {step === 3 && <StepThree />}
      </main>

      {/* Footer Navigation */}
      <div className="fixed bottom-12 w-full px-6 md:px-12 flex flex-col md:flex-row justify-between items-center gap-8 pointer-events-none">
        <div className="text-[10px] font-label text-outline tracking-[0.4em] uppercase">
          Step 0{step} / 03
        </div>
        
        {/* Progress Indicator */}
        <div className="flex gap-3 items-center pointer-events-auto">
          {[1, 2, 3].map((i) => (
            <div 
              key={i} 
              className={`h-1.5 rounded-full transition-all duration-500 ${
                step === i 
                  ? 'w-8 bg-primary shadow-[0_0_10px_rgba(198,191,255,0.4)]' 
                  : step > i 
                    ? 'w-4 bg-primary/50'
                    : 'w-1.5 bg-surface-container-highest'
              }`}
            />
          ))}
        </div>

        {/* Next Button */}
        <button 
          onClick={handleNext}
          className="pointer-events-auto group flex items-center gap-3 bg-primary-container hover:bg-primary-container/80 px-8 py-4 rounded-xl transition-all duration-300 shadow-xl shadow-primary-container/20"
        >
          <span className="font-headline font-semibold text-white uppercase text-sm">{step === 3 ? "Go to Dashboard" : "Next Step"}</span>
          <MoveRight className="text-white group-hover:translate-x-1 transition-transform" size={18} />
        </button>
      </div>

      {/* Abstract Background Elements */}
      <div className="fixed -bottom-24 -left-24 w-96 h-96 bg-primary/5 blur-[120px] rounded-full pointer-events-none -z-10"></div>
      <div className="fixed -top-24 -right-24 w-96 h-96 bg-primary-container/5 blur-[120px] rounded-full pointer-events-none -z-10"></div>
    </div>
  );
}

function StepOne() {
  return (
    <div className="w-full max-w-5xl flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Visual Component */}
      <div className="relative w-full max-w-4xl h-[450px] flex items-center justify-center mb-16">
        {/* Chaos Elements */}
        <div className="absolute left-0 md:left-10 top-20 transform -rotate-12 opacity-40">
          <div className="p-4 rounded-xl bg-surface/40 backdrop-blur-md border border-outline-variant/20 shadow-2xl w-[200px]">
             <div className="h-1.5 w-12 bg-surface-container-highest rounded-full mb-3"></div>
             <div className="h-1.5 w-full bg-surface-container-high rounded-full mb-2"></div>
             <div className="h-1.5 w-3/4 bg-surface-container-high rounded-full"></div>
          </div>
        </div>
        <div className="absolute right-0 md:right-10 top-32 transform rotate-6 opacity-30">
          <div className="p-4 rounded-xl bg-surface/40 backdrop-blur-md border border-outline-variant/20 shadow-2xl w-[220px]">
             <div className="h-1.5 w-16 bg-surface-container-highest rounded-full mb-3"></div>
             <div className="h-1.5 w-full bg-surface-container-high rounded-full"></div>
          </div>
        </div>

        {/* Central Brief Card */}
        <div className="relative z-10 w-full max-w-md p-8 rounded-2xl bg-surface-container-highest border border-primary/30 shadow-[0_0_50px_rgba(108,92,231,0.15)]">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center shadow-lg">
                <FileText className="text-white" size={20} />
              </div>
              <div>
                <h3 className="font-headline font-semibold text-white tracking-widest uppercase">Project Aurora</h3>
                <p className="text-outline text-[10px] font-label uppercase">Campaign Brief #402</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">Active</span>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-3 rounded-lg bg-background border border-white/5">
              <Clock className="text-outline" size={16} />
              <div className="h-1.5 w-32 bg-surface-container-high rounded-full"></div>
            </div>
            <div className="flex items-center gap-4 p-3 rounded-lg bg-background border border-white/5">
              <User className="text-outline" size={16} />
              <div className="h-1.5 w-24 bg-surface-container-high rounded-full"></div>
            </div>
            <div className="h-px w-full bg-white/5 my-2"></div>
            <div className="flex items-center gap-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <Sparkles className="text-primary" size={16} />
              <div className="h-1.5 w-48 bg-primary/20 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center max-w-2xl z-20">
        <h1 className="font-headline text-4xl md:text-6xl font-extrabold tracking-tighter uppercase mb-6 leading-[0.9]">
          Stop the chaos. <br/>
          <span className="text-primary">Centralize your briefs.</span>
        </h1>
        <p className="font-body text-outline text-lg max-w-sm mx-auto font-light leading-relaxed">
          No more chasing messages. Every detail is automatically curated into one editorial command center.
        </p>
      </div>
    </div>
  );
}

function StepTwo() {
  return (
    <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="relative order-2 lg:order-1">
        <div className="grid grid-cols-12 gap-4">
          <div className="col-start-3 lg:col-start-4 col-end-12 lg:col-end-10 bg-surface-container-high rounded-xl p-6 border border-white/5 shadow-xl flex items-center gap-4 transition-transform hover:scale-[1.02] duration-500">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary-container flex items-center justify-center">
              <Sparkles className="text-white" size={20} />
            </div>
            <div>
              <p className="text-[10px] font-label text-primary tracking-widest uppercase">Director</p>
              <p className="text-lg font-headline font-bold uppercase tracking-tight">Alex Rivera</p>
            </div>
          </div>
          
          <div className="col-start-6 col-end-8 h-8 border-l-2 border-dashed border-white/20 mx-auto"></div>
          
          <div className="col-start-2 lg:col-start-3 col-end-13 lg:col-end-11 bg-surface-container-high rounded-xl p-5 border border-white/5 shadow-xl flex items-center gap-4 transition-transform hover:scale-[1.02] duration-500">
            <div className="w-10 h-10 rounded-full bg-surface-container-highest border border-primary/20 flex items-center justify-center">
              <User className="text-primary" size={18} />
            </div>
            <div>
              <p className="text-[10px] font-label text-outline tracking-widest uppercase">Manager</p>
              <p className="text-md font-headline font-bold uppercase tracking-tight">Sarah Chen</p>
            </div>
            <div className="ml-auto w-16 h-1.5 bg-background rounded-full overflow-hidden">
              <div className="h-full bg-primary w-2/3"></div>
            </div>
          </div>

          <div className="col-span-12 grid grid-cols-3 gap-4 mt-6">
            {/* Task Cards */}
            <div className="bg-surface-container-lowest rounded-xl p-4 border border-white/5 flex flex-col items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-tertiary/10 flex items-center justify-center">
                <Clock className="text-tertiary" size={14} />
              </div>
              <p className="text-[9px] text-outline font-label uppercase tracking-widest">Assigned</p>
              <p className="text-xs font-headline font-bold uppercase tracking-tight">UX Research</p>
            </div>
            <div className="bg-surface-container-lowest rounded-xl p-4 border border-primary/30 shadow-[0_0_15px_rgba(108,92,231,0.1)] flex flex-col items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <CheckCircle className="text-primary" size={14} />
              </div>
              <p className="text-[9px] text-primary font-label uppercase tracking-widest">Completed</p>
              <p className="text-xs font-headline font-bold uppercase tracking-tight">Brand Audit</p>
            </div>
            <div className="bg-surface-container-lowest rounded-xl p-4 border border-white/5 flex flex-col items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center">
                <Clock className="text-outline" size={14} />
              </div>
              <p className="text-[9px] text-outline font-label uppercase tracking-widest">Queued</p>
              <p className="text-xs font-headline font-bold uppercase tracking-tight">SEO Setup</p>
            </div>
          </div>
        </div>
      </div>

      <div className="order-1 lg:order-2 flex flex-col gap-6 text-center lg:text-left">
        <span className="text-primary font-label text-[10px] tracking-[0.3em] uppercase font-bold">Accountability</span>
        <h1 className="text-4xl md:text-5xl lg:text-7xl font-headline font-extrabold tracking-tighter uppercase leading-[0.9]">
          Know exactly <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-container">who is doing what.</span>
        </h1>
        <p className="text-base text-outline font-light leading-relaxed max-w-md mx-auto lg:mx-0">
          Eliminate ambiguity with transparent ownership. Every task has a face, every status is live, and every milestone is accounted for.
        </p>
      </div>
    </div>
  );
}

function StepThree() {
  return (
    <div className="w-full max-w-4xl flex flex-col items-center animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="relative mb-16 px-4">
        {/* Glowing Deliverable Component */}
        <div className="w-64 h-80 rounded-2xl bg-surface-container-highest border border-white/10 shadow-2xl flex flex-col p-6 transform rotate-2">
          <div className="h-1.5 w-16 bg-white/20 rounded-full mb-8"></div>
          <div className="space-y-4 mb-12">
            <div className="h-1 w-full bg-white/10 rounded-full"></div>
            <div className="h-1 w-5/6 bg-white/10 rounded-full"></div>
            <div className="h-1 w-4/6 bg-white/10 rounded-full"></div>
          </div>
          
          <div className="mt-auto bg-primary-container/20 rounded-xl p-4 border border-primary-container/40 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center shadow-[0_0_20px_rgba(108,92,231,0.5)]">
              <CheckCircle className="text-white" size={20} />
            </div>
            <div>
              <p className="text-[8px] font-bold text-primary-container uppercase tracking-widest mb-0.5">Status</p>
              <p className="text-white font-headline font-bold uppercase text-sm tracking-tight">Delivered</p>
            </div>
          </div>
        </div>
        
        <div className="absolute -top-6 -left-8 w-64 h-80 rounded-2xl bg-white/[0.02] border border-white/5 -z-10 transform -rotate-3"></div>
      </div>

      <div className="text-center space-y-6 max-w-2xl px-4">
        <h1 className="font-headline font-extrabold text-5xl md:text-7xl tracking-tighter uppercase leading-none">
          Ready to Ship
        </h1>
        <p className="font-body text-outline text-lg font-light max-w-lg mx-auto leading-relaxed border-l-2 border-primary pl-4 text-left">
          Your new workflow starts now. Engineered for extreme creative velocity and brutal accountability.
        </p>
      </div>
    </div>
  );
}
