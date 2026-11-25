import { Link } from 'react-router-dom';
import {
  Sparkles,
  PhoneCall,
  MessageSquareText,
  Brain,
  CalendarCheck2,
  ShieldCheck,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Zap,
  Globe,
  Headphones,
} from 'lucide-react';

const FEATURES = [
  {
    icon: PhoneCall,
    title: 'Real-Time AI Voice Agent',
    desc: 'Natural multilingual voice calls in English, Hindi, and Hinglish via Deepgram STT, ElevenLabs TTS, and Twilio/Exotel.',
    color: 'bg-violet-50 text-violet-600',
  },
  {
    icon: MessageSquareText,
    title: 'Shared Voice & Text Intelligence',
    desc: 'Switch seamlessly between voice and text chat on the same conversation ID without losing context or memory.',
    color: 'bg-sky-50 text-sky-600',
  },
  {
    icon: Brain,
    title: 'LangGraph Autonomous Engine',
    desc: 'Detects intent, retrieves grounded answers from MongoDB Atlas Vector Search RAG, and executes CRM tools.',
    color: 'bg-indigo-50 text-indigo-600',
  },
  {
    icon: CalendarCheck2,
    title: 'Autonomous Demo Booking',
    desc: 'Checks live Google Calendar availability, confirms slots, prevents double-bookings, and sends email invites.',
    color: 'bg-emerald-50 text-emerald-600',
  },
  {
    icon: BarChart3,
    title: 'Lead Scoring & Sentiment AI',
    desc: 'Deterministic weighted lead qualification (0–100) paired with real-time sentiment & buying-signal detection.',
    color: 'bg-amber-50 text-amber-600',
  },
  {
    icon: ShieldCheck,
    title: 'Enterprise Multi-Tenant Security',
    desc: 'Strict organization-level data isolation, RBAC, HttpOnly refresh token rotation, and audit logging.',
    color: 'bg-rose-50 text-rose-600',
  },
];

const STATS = [
  { value: '10x', label: 'Faster Lead Response' },
  { value: '95%', label: 'Qualification Accuracy' },
  { value: '24/7', label: 'Always-On AI Agent' },
  { value: '<2s', label: 'Voice Latency' },
];

const STEPS = [
  { step: '01', title: 'Create Your Organization', desc: 'Sign up and configure your multi-tenant workspace in seconds.' },
  { step: '02', title: 'Train Your AI Agent', desc: 'Upload product docs, set personality, language, and sales instructions.' },
  { step: '03', title: 'Start Selling Autonomously', desc: 'Your AI handles voice calls, texts, qualifies leads, and books demos.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200/80 sticky top-0 bg-white/80 backdrop-blur-xl z-20">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="font-bold text-lg tracking-tight">SalesPilot AI</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="btn-ghost">
              Sign in
            </Link>
            <Link to="/register" className="btn-primary">
              Start Free Trial
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Background gradient orbs */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-indigo-100 rounded-full blur-3xl opacity-40" />
          <div className="absolute top-[10%] right-[-5%] w-[400px] h-[400px] bg-violet-100 rounded-full blur-3xl opacity-30" />
          <div className="absolute bottom-[-10%] left-[30%] w-[350px] h-[350px] bg-sky-100 rounded-full blur-3xl opacity-30" />
        </div>
        <div className="max-w-7xl mx-auto px-6 py-24 lg:py-32 text-center animate-fade-in">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60 shadow-sm">
            <Zap className="h-3.5 w-3.5" />
            Autonomous AI Sales Voice & Text Platform
          </span>
          <h1 className="mt-8 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 max-w-4xl mx-auto leading-[1.1]">
            Close more deals with an{' '}
            <span className="gradient-text">autonomous AI sales team</span>{' '}
            on voice and text
          </h1>
          <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            SalesPilot AI qualifies leads, answers grounded product questions from your knowledge base, analyzes sentiment, and books Google Calendar demos — automatically.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register" className="btn-primary px-7 py-3.5 text-base shadow-lg shadow-indigo-600/20">
              Launch Your AI Agent <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/login" className="btn-secondary px-7 py-3.5 text-base">
              Open Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-y border-slate-200/80 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {STATS.map(({ value, label }) => (
              <div key={label} className="text-center">
                <p className="text-3xl font-extrabold gradient-text">{value}</p>
                <p className="mt-1.5 text-sm text-slate-600 font-medium">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Everything your revenue team needs
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Built for modern B2B teams that demand real-time responsiveness and accurate CRM execution.
            </p>
          </div>
          <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc, color }, idx) => (
              <div
                key={title}
                className="card-hover p-6 group animate-slide-up"
                style={{ animationDelay: `${idx * 80}ms`, animationFillMode: 'both' }}
              >
                <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${color} transition-transform group-hover:scale-110`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 font-semibold text-slate-900 text-lg">{title}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-slate-50/80 border-y border-slate-200/60 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Up and running in 3 steps
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Go from sign-up to AI-powered sales in under 10 minutes.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map(({ step, title, desc }) => (
              <div key={step} className="relative">
                <div className="text-5xl font-black text-indigo-100 mb-3">{step}</div>
                <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-2 text-slate-400 mb-4">
            <Globe className="h-4 w-4" />
            <Headphones className="h-4 w-4" />
            <Brain className="h-4 w-4" />
          </div>
          <p className="text-xl font-semibold text-slate-700 max-w-2xl mx-auto">
            "SalesPilot AI reduced our lead response time from hours to seconds. The autonomous voice agent handles 80% of initial qualification without human intervention."
          </p>
          <p className="mt-4 text-sm text-slate-500">— AI Sales Operations Lead, Enterprise SaaS</p>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-slate-50/60 border-y border-slate-200/60 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Simple, transparent pricing</h2>
            <p className="mt-4 text-lg text-slate-600">Start with a 14-day free trial. No credit card required.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { name: 'Starter', price: '$49', period: '/mo', features: ['1 AI Sales Agent', '1,000 Voice/Text mins', 'CRM & RAG Knowledge Base', 'Email Support'] },
              { name: 'Growth', price: '$149', period: '/mo', features: ['5 AI Sales Agents', '5,000 Voice/Text mins', 'Google Calendar & Twilio/Exotel', 'Priority Support', 'Advanced Analytics'], highlight: true },
              { name: 'Enterprise', price: 'Custom', period: '', features: ['Unlimited Agents', 'Dedicated Vector Search', 'SSO, Audit Logs & SLA', 'Dedicated Success Manager', 'Custom Integrations'] },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`card p-8 flex flex-col justify-between relative ${
                  plan.highlight ? 'border-indigo-600 ring-2 ring-indigo-600 shadow-xl shadow-indigo-600/10' : ''
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="badge-indigo px-3 py-1 text-xs font-bold shadow-sm">Most Popular</span>
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-lg text-slate-900">{plan.name}</h3>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-slate-900">{plan.price}</span>
                    {plan.period && <span className="text-sm text-slate-500 font-medium">{plan.period}</span>}
                  </div>
                  <ul className="mt-8 space-y-3.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2.5 text-sm text-slate-600">
                        <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <Link
                  to="/register"
                  className={`mt-10 w-full text-center ${plan.highlight ? 'btn-primary' : 'btn-secondary'}`}
                >
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Ready to automate your sales pipeline?
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Deploy your AI sales agent in minutes and start converting leads 24/7.
          </p>
          <div className="mt-8">
            <Link to="/register" className="btn-primary px-8 py-3.5 text-base shadow-lg shadow-indigo-600/20">
              Start Free Trial <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200/80 py-10 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white">
              <Sparkles className="h-3 w-3" />
            </div>
            <span className="font-semibold text-sm text-slate-700">SalesPilot AI</span>
          </div>
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} SalesPilot AI. Autonomous AI Sales Automation Platform.
          </p>
        </div>
      </footer>
    </div>
  );
}
