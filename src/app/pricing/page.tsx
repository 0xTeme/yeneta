"use client";

import PublicNavbar from "@/components/PublicNavbar";
import PricingCard from "@/components/pricing/PricingCard";

export default function PricingPage() {
  const plans = [
    {
      title: "Starter",
      price: "0 ETB",
      description: "Perfect for first-time learners exploring Yeneta.",
      features: [
        "Basic AI support",
        "5 uploads / month",
        "5 quizzes / month",
        "15 min voice"
      ],
      ctaText: "Get Started",
      variant: "starter" as const,
    },
    {
      title: "Premium",
      price: "149 ETB / month",
      description: "Affordable study support for everyday student learning.",
      features: [
        "40 uploads / month",
        "15-question quizzes",
        "1h 20m voice",
        "faster responses"
      ],
      ctaText: "Upgrade Now",
      variant: "premium" as const,
    },
    {
      title: "Gold",
      price: "349 ETB / month",
      description: "Designed for serious study, exam prep, and teaching support.",
      features: [
        "100 uploads / month",
        "advanced AI support",
        "4h voice",
        "better limits"
      ],
      ctaText: "Upgrade Now",
      badge: "Most Popular",
      variant: "gold" as const,
    },
    {
      title: "Diamond",
      price: "599 ETB / month",
      description: "For deep research, heavy academic work, and professional use.",
      features: [
        "250 uploads / month",
        "deep analysis",
        "10h voice",
        "priority processing"
      ],
      ctaText: "Upgrade Now",
      badge: "Best for Power Users",
      variant: "diamond" as const,
    }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col font-body text-content relative overflow-hidden">
      
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />

      <PublicNavbar />

      <main className="flex-1 flex flex-col items-center px-4 md:px-8 mt-12 md:mt-16 pb-24 relative z-10 w-full max-w-[1440px] mx-auto">
        
        <section className="text-center mb-16 md:mb-24 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-4xl md:text-6xl font-extrabold text-content mb-6 tracking-tight font-headline">
            Flexible Plans for Every Learner
          </h1>
          <p className="text-lg md:text-xl text-content-muted leading-relaxed mb-4 font-medium">
            From first-time students to advanced professionals, Yeneta grows with your learning needs.
          </p>
          <p className="text-sm text-primary font-bold tracking-wide uppercase font-label">
            Affordable bilingual AI learning in Amharic and English.
          </p>
        </section>

        <section className="w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6 items-center">
            {plans.map((plan, index) => (
              <PricingCard 
                key={plan.title}
                title={plan.title}
                price={plan.price}
                description={plan.description}
                features={plan.features}
                ctaText={plan.ctaText}
                badge={plan.badge}
                variant={plan.variant}
                delay={index * 100}
              />
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}