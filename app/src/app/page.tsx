import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import Modes from "@/components/Modes";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <div className="gradient-mesh" aria-hidden="true" />
      <Navbar />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Modes />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
