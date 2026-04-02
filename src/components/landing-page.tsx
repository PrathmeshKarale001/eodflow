import Link from "next/link";

export function LandingPage() {
  return (
    <>

        <div className="data-grid gap-4">
          <section className="col-span-12 lg:col-span-8 brutalist-border p-8 md:p-12 relative overflow-hidden bg-surface-container-low min-h-[500px] flex flex-col justify-end">
            <div className="absolute top-0 right-0 p-4 border-l border-b border-on-surface/10 font-label text-[10px] text-on-surface/30">
              ID: 0x29A-SYS-FLOW
            </div>
            
            <div className="relative z-10 space-y-6">
              <div className="inline-block px-3 py-1 bg-card/5 border border-on-surface/10 font-label text-[10px] uppercase tracking-[0.4em] text-primary">
                Internal Tool — End Of Day Media
              </div>
              <h1 className="font-headline text-5xl md:text-8xl font-extrabold tracking-tighter uppercase leading-[0.9]">
                Stop chasing.<br />
                <span className="text-primary">Start shipping.</span>
              </h1>
              <p className="text-sm md:text-base text-outline max-w-xl font-light leading-relaxed border-l-2 border-primary pl-4">
                The bespoke operational nervous system designed specifically for the pace of End Of Day Media. No noise, just flow.
              </p>
              
              <div className="flex flex-wrap gap-4 pt-4">
                <Link href="/login" className="px-8 py-4 bg-primary-container text-white font-headline font-bold uppercase text-sm flex items-center gap-4 hover:invert transition-all">
                  Get started <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
                <button className="px-8 py-4 border border-white/20 text-white font-headline font-bold uppercase text-sm flex items-center gap-4 hover:bg-card hover:text-black transition-all">
                  See how it works <span className="material-symbols-outlined text-sm">arrow_downward</span>
                </button>
              </div>
            </div>
            
            <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 pointer-events-none border-l border-white/5">
              <div className="w-full h-full flex flex-col">
                <div className="h-1/4 border-b border-on-surface/10 flex">
                  <div className="w-1/3 border-r border-on-surface/10"></div>
                  <div className="w-1/3 border-r border-on-surface/10"></div>
                </div>
                <div className="h-2/4 border-b border-on-surface/10"></div>
                <div className="h-1/4 grid grid-cols-4">
                  <div className="border-r border-on-surface/10"></div>
                  <div className="border-r border-on-surface/10"></div>
                  <div className="border-r border-on-surface/10"></div>
                </div>
              </div>
            </div>
          </section>

          <section className="col-span-12 lg:col-span-4 grid grid-cols-2 gap-4">
            <div className="brutalist-border bg-surface-container-lowest p-6 flex flex-col justify-between">
              <span className="font-label text-[10px] text-on-surface/40 uppercase">TEAM_CAPACITY</span>
              <div>
                <div className="text-4xl font-headline font-extrabold text-white">25-50</div>
                <div className="w-full h-1 bg-card/5 mt-2"><div className="w-2/3 h-full bg-primary"></div></div>
              </div>
            </div>
            
            <div className="brutalist-border bg-surface-container-lowest p-6 flex flex-col justify-between">
              <span className="font-label text-[10px] text-on-surface/40 uppercase">ACTIVE_CLIENTS</span>
              <div>
                <div className="text-4xl font-headline font-extrabold text-white">9-11</div>
                <div className="w-full h-1 bg-card/5 mt-2"><div className="w-1/2 h-full bg-tertiary"></div></div>
              </div>
            </div>
            
            <div className="brutalist-border bg-surface-container-lowest p-6 flex flex-col justify-between">
              <span className="font-label text-[10px] text-on-surface/40 uppercase">BRIEF_TRACKING</span>
              <div>
                <div className="text-4xl font-headline font-extrabold text-primary">100%</div>
                <div className="w-full h-1 bg-card/5 mt-2"><div className="w-full h-full bg-primary"></div></div>
              </div>
            </div>
            
            <div className="brutalist-border bg-surface-container-lowest p-6 flex flex-col justify-between">
              <span className="font-label text-[10px] text-on-surface/40 uppercase">UPTIME</span>
              <div>
                <div className="text-4xl font-headline font-extrabold text-white">24/7</div>
                <div className="w-full h-1 bg-card/5 mt-2"><div className="w-[98%] h-full bg-green-500"></div></div>
              </div>
            </div>
            
            <div className="col-span-2 brutalist-border bg-surface-container-high p-6">
              <span className="font-label text-[10px] text-on-surface/40 uppercase block mb-4">SYSTEM_STATUS</span>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-[10px] font-label uppercase">
                  <span>Core Engine</span>
                  <span className="text-green-500">Nominal</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-label uppercase">
                  <span>Kanban Sync</span>
                  <span className="text-green-500">Stable</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-label uppercase">
                  <span>API Bridge</span>
                  <span className="text-tertiary">Congested</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        <section className="data-grid gap-4">
          <div className="col-span-12 lg:col-span-4 brutalist-border p-8 bg-surface-container-lowest flex flex-col justify-between gap-12">
            <div>
              <span className="text-primary font-label text-[10px] font-bold uppercase block mb-4">LOG_01: The Problem</span>
              <h2 className="text-2xl font-headline font-extrabold uppercase mb-6 leading-none">WhatsApp chaos is where velocity goes to die.</h2>
              <p className="text-outline text-sm leading-relaxed">
                Scattered messages, lost briefs, and "is this done?" pings at midnight. Traditional tools are too bulky, but chat is too messy.
              </p>
            </div>
            <div className="pt-8 border-t border-on-surface/10">
              <span className="text-tertiary font-label text-[10px] font-bold uppercase block mb-4">LOG_02: The Solution</span>
              <h2 className="text-2xl font-headline font-extrabold uppercase mb-6 leading-none">One system for every single brief.</h2>
              <p className="text-outline text-sm leading-relaxed">
                EOD Flow centralizes communication into actionable task boards. Every client request has a home, a status, and an owner.
              </p>
            </div>
          </div>
          
          <div className="col-span-12 lg:col-span-8 brutalist-border bg-black p-4 relative min-h-[400px]">
            <div className="flex items-center gap-4 mb-4 font-label text-[10px] border-b border-on-surface/10 pb-4">
              <span className="text-primary font-bold">SCHEMATIC_VIEW: KANBAN_V0.1</span>
              <div className="flex gap-1 ml-auto">
                <div className="w-3 h-3 border border-white/20"></div>
                <div className="w-3 h-3 border border-white/20"></div>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-8 h-full pb-8">
              <div className="space-y-4">
                <div className="text-[10px] font-label uppercase text-on-surface/30 px-2 py-1 bg-card/5">IN_BRIEF</div>
                <div className="border border-on-surface/10 p-4 space-y-3 opacity-50">
                  <div className="h-1 bg-card/20 w-full"></div>
                  <div className="h-1 bg-card/10 w-2/3"></div>
                  <div className="h-4 w-4 border border-white/20 rounded-full"></div>
                </div>
                <div className="border border-on-surface/10 p-4 space-y-3">
                  <div className="h-1 bg-card/20 w-full"></div>
                  <div className="h-1 bg-card/10 w-1/3"></div>
                </div>
              </div>
              
              <div className="space-y-4 border-x border-white/5 px-4">
                <div className="text-[10px] font-label uppercase text-primary px-2 py-1 bg-primary/10">ACTIVE_PROCESS</div>
                <div className="border border-primary/50 p-4 space-y-4 bg-primary/5">
                  <div className="flex justify-between items-center">
                    <div className="h-1 bg-primary w-3/4"></div>
                    <div className="w-2 h-2 bg-primary"></div>
                  </div>
                  <div className="h-1 bg-card/10 w-1/2"></div>
                  <div className="flex -space-x-2 pt-2">
                    <div className="w-6 h-6 border border-white/20 rounded-full bg-surface"></div>
                    <div className="w-6 h-6 border border-white/20 rounded-full bg-surface"></div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="text-[10px] font-label uppercase text-on-surface/30 px-2 py-1 bg-card/5">QUALITY_GATE</div>
                <div className="border border-on-surface/10 p-4 opacity-20">
                  <div className="h-1 bg-card/20 w-full"></div>
                </div>
              </div>
            </div>
            
            <div className="absolute bottom-4 right-4 text-primary font-label text-[10px]">RESCAN_ACTIVE...</div>
          </div>
        </section>

        <section className="brutalist-border bg-surface-container-lowest p-8">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 border-b border-on-surface/10 pb-8 gap-6">
            <div>
              <span className="text-primary font-label text-[10px] font-bold uppercase block mb-2">SYSTEM_CAPABILITIES</span>
              <h2 className="text-3xl md:text-5xl font-headline font-extrabold uppercase">Built for Agencies.</h2>
            </div>
            <div className="text-outline font-label text-xs uppercase text-right">
              Module_v4.2 / Efficiency_Override: ACTIVE
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border-l border-t border-on-surface/10">
            <div className="group p-8 border-r border-b border-on-surface/10 hover:bg-primary-container/10 transition-colors">
              <div className="font-label text-primary text-xs mb-6">01_TRANSFORM</div>
              <h3 className="text-xl font-headline font-extrabold uppercase mb-4">Brief to board</h3>
              <p className="text-sm text-outline font-light leading-relaxed">Instantly convert unstructured messages into rich task cards with due dates and owners.</p>
            </div>
            <div className="group p-8 border-r border-b border-on-surface/10 hover:bg-primary-container/10 transition-colors">
              <div className="font-label text-primary text-xs mb-6">02_VAULT</div>
              <h3 className="text-xl font-headline font-extrabold uppercase mb-4">File home</h3>
              <p className="text-sm text-outline font-light leading-relaxed">A centralized vault for all creative assets. No more expired WeTransfer links or lost attachments.</p>
            </div>
            <div className="group p-8 border-r border-b border-on-surface/10 hover:bg-primary-container/10 transition-colors">
              <div className="font-label text-primary text-xs mb-6">03_GATEKEEPER</div>
              <h3 className="text-xl font-headline font-extrabold uppercase mb-4">Review gates</h3>
              <p className="text-sm text-outline font-light leading-relaxed">Multi-stage approval workflows to ensure nothing leaves the agency without Director sign-off.</p>
            </div>
            <div className="group p-8 border-r border-b border-on-surface/10 hover:bg-primary-container/10 transition-colors">
              <div className="font-label text-primary text-xs mb-6">04_ANALYTICS</div>
              <h3 className="text-xl font-headline font-extrabold uppercase mb-4">Status dashboards</h3>
              <p className="text-sm text-outline font-light leading-relaxed">Birds-eye view of agency capacity. Know who's overloaded and who's ready for the next sprint.</p>
            </div>
            <div className="group p-8 border-r border-b border-on-surface/10 hover:bg-primary-container/10 transition-colors">
              <div className="font-label text-primary text-xs mb-6">05_TERMINAL</div>
              <h3 className="text-xl font-headline font-extrabold uppercase mb-4">Mobile-ready</h3>
              <p className="text-sm text-outline font-light leading-relaxed">The full power of the EOD system in your pocket. Manage workflows from the set or the commute.</p>
            </div>
            <div className="group p-8 border-r border-b border-on-surface/10 hover:bg-primary-container/10 transition-colors">
              <div className="font-label text-primary text-xs mb-6">06_ARCHITECTURE</div>
              <h3 className="text-xl font-headline font-extrabold uppercase mb-4">Hierarchy</h3>
              <p className="text-sm text-outline font-light leading-relaxed">Organize work by Client, Campaign, and Component. Granular control for complex accounts.</p>
            </div>
          </div>
        </section>

        <section className="brutalist-border p-8 bg-black overflow-hidden relative">
          <div className="absolute inset-0 opacity-5">
            <div className="w-full h-full border-[20px] border-white rotate-45 scale-150"></div>
          </div>
          <div className="relative z-10">
            <div className="text-center mb-16">
              <span className="text-primary font-label text-[10px] font-bold uppercase block mb-4">PIPELINE_FLOW</span>
              <h2 className="text-4xl font-headline font-extrabold uppercase">From brief to delivered.</h2>
            </div>
            
            <div className="flex flex-col lg:flex-row justify-between items-stretch gap-4">
              <div className="flex-1 brutalist-border p-6 bg-surface-container-low">
                <div className="font-label text-on-surface/20 text-[10px] mb-4">STAGE_01</div>
                <h4 className="font-headline font-bold text-lg mb-2 text-primary">Brief</h4>
                <p className="text-[10px] text-outline uppercase font-label">Input request</p>
              </div>
              <div className="flex items-center justify-center lg:rotate-0 rotate-90 opacity-20"><span className="material-symbols-outlined">double_arrow</span></div>
              
              <div className="flex-1 brutalist-border p-6 bg-surface-container-low">
                <div className="font-label text-on-surface/20 text-[10px] mb-4">STAGE_02</div>
                <h4 className="font-headline font-bold text-lg mb-2">Tasks</h4>
                <p className="text-[10px] text-outline uppercase font-label">Deconstruct</p>
              </div>
              <div className="flex items-center justify-center lg:rotate-0 rotate-90 opacity-20"><span className="material-symbols-outlined">double_arrow</span></div>
              
              <div className="flex-1 brutalist-border p-6 bg-surface-container-low">
                <div className="font-label text-on-surface/20 text-[10px] mb-4">STAGE_03</div>
                <h4 className="font-headline font-bold text-lg mb-2">Work</h4>
                <p className="text-[10px] text-outline uppercase font-label">Creation phase</p>
              </div>
              <div className="flex items-center justify-center lg:rotate-0 rotate-90 opacity-20"><span className="material-symbols-outlined">double_arrow</span></div>
              
              <div className="flex-1 brutalist-border p-6 bg-surface-container-low">
                <div className="font-label text-on-surface/20 text-[10px] mb-4">STAGE_04</div>
                <h4 className="font-headline font-bold text-lg mb-2">Review</h4>
                <p className="text-[10px] text-outline uppercase font-label">Quality gate</p>
              </div>
              <div className="flex items-center justify-center lg:rotate-0 rotate-90 opacity-20"><span className="material-symbols-outlined">double_arrow</span></div>
              
              <div className="flex-1 brutalist-border p-6 bg-primary/20 border-primary">
                <div className="font-label text-primary text-[10px] mb-4">STAGE_05</div>
                <h4 className="font-headline font-bold text-lg mb-2">Delivered</h4>
                <p className="text-[10px] text-primary uppercase font-label">Client success</p>
              </div>
            </div>
          </div>
        </section>

        <section className="data-grid gap-4">
          <div className="col-span-12 brutalist-border p-8 bg-surface-container-low">
            <div className="mb-12">
              <span className="text-primary font-label text-[10px] font-bold uppercase block mb-4">ACCESS_LEVELS</span>
              <h2 className="text-3xl font-headline font-extrabold uppercase">Custom views for your flow.</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="brutalist-border p-6 hover:border-primary transition-all group">
                <div className="flex items-center gap-2 mb-8">
                  <span className="w-1 h-6 bg-primary block"></span>
                  <span className="text-primary font-label font-bold uppercase text-[10px] tracking-widest">Lvl 01: Director</span>
                </div>
                <h3 className="text-lg font-headline font-bold uppercase mb-3">Full Agency Pulse</h3>
                <p className="text-xs text-outline leading-relaxed font-light">High-level insights into profitability, team bandwidth, and strategic timelines.</p>
              </div>
              
              <div className="brutalist-border p-6 hover:border-tertiary transition-all">
                <div className="flex items-center gap-2 mb-8">
                  <span className="w-1 h-6 bg-tertiary block"></span>
                  <span className="text-tertiary font-label font-bold uppercase text-[10px] tracking-widest">Lvl 02: Account Manager</span>
                </div>
                <h3 className="text-lg font-headline font-bold uppercase mb-3">Client Happiness</h3>
                <p className="text-xs text-outline leading-relaxed font-light">Ensure every client brief is moving and assets are ready for the weekly sync.</p>
              </div>
              
              <div className="brutalist-border p-6 hover:border-on-secondary-container transition-all">
                <div className="flex items-center gap-2 mb-8">
                  <span className="w-1 h-6 bg-on-secondary-container block"></span>
                  <span className="text-on-secondary-container font-label font-bold uppercase text-[10px] tracking-widest">Lvl 03: Team Lead</span>
                </div>
                <h3 className="text-lg font-headline font-bold uppercase mb-3">Workflow Logic</h3>
                <p className="text-xs text-outline leading-relaxed font-light">Manage sprints, assign tasks, and unblock team members in real-time.</p>
              </div>
              
              <div className="brutalist-border p-6 hover:border-inverse-primary transition-all">
                <div className="flex items-center gap-2 mb-8">
                  <span className="w-1 h-6 bg-inverse-primary block"></span>
                  <span className="text-inverse-primary font-label font-bold uppercase text-[10px] tracking-widest">Lvl 04: Team Member</span>
                </div>
                <h3 className="text-lg font-headline font-bold uppercase mb-3">The Work List</h3>
                <p className="text-xs text-outline leading-relaxed font-light">Clear, distraction-free view of exactly what needs to be done today.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="brutalist-border bg-primary-container p-12 md:p-24 relative overflow-hidden group">
          <div className="relative z-10 text-center space-y-12">
            <h2 className="text-4xl md:text-7xl font-headline font-extrabold text-white uppercase tracking-tighter leading-none max-w-4xl mx-auto">
              Ready to stop chasing updates?
            </h2>
            <div className="flex flex-col items-center gap-6">
              <Link href="/login" className="bg-card text-black px-12 py-6 font-headline font-extrabold uppercase text-xl flex items-center gap-4 hover:bg-black hover:text-white transition-all scale-110">
                INITIALIZE_FLOW <span className="material-symbols-outlined font-bold">bolt</span>
              </Link>
              <p className="font-label text-[10px] tracking-[0.4em] uppercase opacity-70">Internal use only · end of day media</p>
            </div>
          </div>
          
          <div className="absolute inset-0 grid grid-cols-12 gap-1 opacity-10 pointer-events-none p-4">
            <div className="flex flex-col gap-2 font-label text-[8px] text-white"><span>0101</span><span>1100</span><span>1010</span><span>0001</span><span>1111</span><span>0101</span></div>
            <div className="flex flex-col gap-2 font-label text-[8px] text-white pt-10"><span>0111</span><span>1000</span><span>1110</span><span>0101</span><span>1010</span><span>0001</span></div>
            <div className="flex flex-col gap-2 font-label text-[8px] text-white"><span>1010</span><span>1100</span><span>0101</span><span>1111</span><span>1010</span><span>0001</span></div>
            <div className="hidden lg:flex flex-col gap-2 font-label text-[8px] text-white pt-20"><span>0101</span><span>1100</span><span>1010</span><span>0001</span><span>1111</span><span>0101</span></div>
            <div className="hidden lg:flex flex-col gap-2 font-label text-[8px] text-white"><span>0111</span><span>1000</span><span>1110</span><span>0101</span><span>1010</span><span>0001</span></div>
          </div>
        </section>

        <footer className="data-grid gap-4 mt-8">
          <div className="col-span-12 brutalist-border p-6 bg-surface-container-lowest flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <span className="text-lg font-headline font-bold text-white uppercase block mb-1">EOD Flow</span>
              <p className="text-[10px] font-label text-on-surface/40 uppercase tracking-widest">Built by End Of Day Media · Part of Lokshahi Group</p>
            </div>
            <div className="flex gap-8">
              <Link className="font-label text-[10px] uppercase text-on-surface/40 hover:text-primary transition-colors" href="#">CONTACT US</Link>
              <Link className="font-label text-[10px] uppercase text-on-surface/40 hover:text-primary transition-colors" href="#">FAQ</Link>
              <Link className="font-label text-[10px] uppercase text-on-surface/40 hover:text-primary transition-colors" href="#">GUIDE</Link>
            </div>
            <div className="font-label text-[10px] border border-on-surface/10 px-3 py-1 bg-card/5">
              v1.0.RC_2026
            </div>
          </div>
        </footer>
    </>
  );
}
