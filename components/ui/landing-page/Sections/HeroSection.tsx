"use client";
import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Oswald } from "next/font/google";
import { useTheme } from "@/components/contexts/theme-context";
import { Input, Button } from "@/components/shared";
import { PopupModal } from "react-calendly";

function HeroSection() {
  const prefersReducedMotion = useReducedMotion();
  const [isPaused, setIsPaused] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const [showVideo, setShowVideo] = useState(false);
  const [email, setEmail] = useState("");
  const [calendlyOpen, setCalendlyOpen] = useState(false);
  const [calendlyUrl, setCalendlyUrl] = useState("");
  const [videoModalOpen, setVideoModalOpen] = useState(false);

  // Handle escape key to close video modal
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && videoModalOpen) {
        setVideoModalOpen(false);
      }
    };

    if (videoModalOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset'; // Restore scrolling
    };
  }, [videoModalOpen]);

  const handleCalendlyOpen = () => {
    if (!email.trim()) {
      alert("Please enter your email.");
      return;
    }

    const emailPattern = /^\S+@\S+\.\S+$/;
    if (!emailPattern.test(email)) {
      alert("Please enter a valid email.");
      return;
    }

    const url = `https://calendly.com/avorino/simple-projex-demo?email=${encodeURIComponent(
      email
    )}`;
    setCalendlyUrl(url);
    setCalendlyOpen(true);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  return (
    <div>
      {/* Hero section (keeping as requested) */}
      <section
        ref={heroRef}
        className="relative p-4 py-24 overflow-hidden"
        style={{
          backgroundColor: "hsl(0, 85%, 30%)", // Primary red color
        }}
      >
        {/* Decorative elements for maximalist style */}
        <div className="overflow-hidden">
          {/* Large geometric shapes with improved animations */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 2, ease: "easeOut" }}
            className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-secondary/20 blur-3xl"
            style={{ backgroundColor: "hsla(40, 100%, 50%, 0.2)" }}
          ></motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 2.3, delay: 0.2, ease: "easeOut" }}
            className="absolute top-1/4 -right-20 w-80 h-80 rounded-full bg-accent/20 blur-3xl"
            style={{ backgroundColor: "hsla(30, 50%, 30%, 0.2)" }}
          ></motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 2.6, delay: 0.4, ease: "easeOut" }}
            className="absolute bottom-0 left-1/3 w-[40rem] h-[40rem] rounded-full bg-secondary/10 blur-3xl"
            style={{ backgroundColor: "hsla(40, 100%, 50%, 0.1)" }}
          ></motion.div>

          {/* Grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>

          {/* Diagonal lines with subtle animation */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5, delay: 0.6 }}
            className="absolute top-0 left-0 right-0 h-full w-full overflow-hidden"
          >
            <motion.div
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 1.8, delay: 0.2 }}
              className="absolute top-1/4 left-0 w-full h-[2px] bg-white/10 -rotate-[30deg] transform origin-left"
            ></motion.div>
            <motion.div
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 1.8, delay: 0.4 }}
              className="absolute top-1/3 left-0 w-full h-[1px] bg-white/10 rotate-[20deg] transform origin-left"
            ></motion.div>
            <motion.div
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 1.8, delay: 0.6 }}
              className="absolute top-2/3 left-0 w-full h-[3px] bg-white/5 -rotate-[10deg] transform origin-left"
            ></motion.div>
          </motion.div>

          {/* Construction-themed elements with subtle animations */}
          <motion.div
            initial={{ opacity: 0, rotate: 35 }}
            animate={{ opacity: 1, rotate: 45 }}
            transition={{ duration: 1.5, delay: 0.8 }}
            className="absolute top-20 right-20 w-40 h-40 border-8 border-white/10"
          ></motion.div>
          <motion.div
            initial={{ opacity: 0, rotate: 0 }}
            animate={{ opacity: 1, rotate: 12 }}
            transition={{ duration: 1.5, delay: 1 }}
            className="absolute bottom-40 left-20 w-20 h-20 border-4 border-white/10"
          ></motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.5, delay: 1.2 }}
            className="absolute top-1/2 left-1/2 w-60 h-60 border-2 border-dashed border-white/10 rounded-full"
          ></motion.div>

          {/* Gradient overlay for smooth transition to white */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent"></div>
        </div>

        {/* Hero content - centered vertically & horizontally */}
        <div className="container relative z-10 h-full flex items-center justify-center mx-auto pb-36">
          <div className="grid gap-16 md:grid-cols-2 items-center py-16 text-center md:text-left">
            {/* Left column - Value proposition */}
            <motion.div
              className="space-y-8"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="inline-block rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-white backdrop-blur"
              >
                Introducing Simple ProjeX
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl"
              >
                Build Better
                <span className="block" style={{ color: "hsl(40, 100%, 50%)" }}>
                  Proposals.
                </span>
                <span className="block mt-2">Win More</span>
                <span className="block" style={{ color: "hsl(40, 100%, 50%)" }}>
                  Projects.
                </span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.7 }}
                className="max-w-[600px] text-xl text-white/80 mx-auto md:mx-0"
              >
                The professional proposal builder designed specifically for
                construction industry professionals.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.9 }}
                className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start"
              >
                <form
                  className="flex-1 max-w-md"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleCalendlyOpen();
                  }}
                >
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="h-12 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white"
                  />
                </form>                <Link href={`/onboarding${email ? `?email=${encodeURIComponent(email)}` : ''}`}>
                  <Button
                    size="lg"
                    className="rounded-full bg-white hover:bg-white/90 text-lg px-8 h-12"
                    style={{ color: "hsl(0, 85%, 30%)" }}
                  >
                    Get Started <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>

                {typeof window !== "undefined" && (
                  <PopupModal
                    url={calendlyUrl}
                    open={calendlyOpen}
                    onModalClose={() => setCalendlyOpen(false)}
                    rootElement={document.body}
                  />
                )}
              </motion.div>
            </motion.div>

            {/* ENHANCED: Image collage with staggered and interactive animations */}
            <div className="relative">
              <motion.div
                className="relative h-[550px] w-full"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                onHoverStart={() => setIsPaused(true)}
                onHoverEnd={() => setIsPaused(false)}
              >
                {/* Main image */}
                <motion.div
                  className="absolute top-0 left-0 w-3/4 h-3/5 rounded-lg overflow-hidden border-4 border-white shadow-xl z-30 transform rotate-2"
                  variants={itemVariants}
                  whileHover={{ scale: 1.03, transition: { duration: 0.3 } }}
                  animate={
                    prefersReducedMotion
                      ? {}
                      : {
                          rotate: [2, 2.5, 2],
                          transition: {
                            duration: 8,
                            repeat: Infinity,
                            repeatType: "reverse",
                          },
                        }
                  }
                >
                  <Image
                    src="https://simpleprojexbucket.s3.us-west-1.amazonaws.com/static/landing/Template.png"
                    alt="Modern living room"
                    fill
                    className="object-cover"
                  />
                </motion.div>

                {/* Secondary images */}
                <motion.div
                  className="absolute top-1/4 right-0 w-2/5 h-2/5 rounded-lg overflow-hidden border-4 border-white shadow-xl z-20 transform -rotate-3"
                  variants={itemVariants}
                  whileHover={{ scale: 1.05, transition: { duration: 0.3 } }}
                  animate={
                    prefersReducedMotion
                      ? {}
                      : {
                          rotate: [-3, -4, -3],
                          transition: {
                            duration: 7,
                            repeat: Infinity,
                            repeatType: "reverse",
                            delay: 0.5,
                          },
                        }
                  }
                >
                  <Image
                    src="https://simpleprojexbucket.s3.us-west-1.amazonaws.com/static/landing/cont.png"
                    alt="Modern kitchen"
                    fill
                    className="object-cover"
                  />
                </motion.div>

                <motion.div
                  className="absolute bottom-0 right-1/4 w-2/5 h-2/5 rounded-lg overflow-hidden border-4 border-white shadow-xl z-20 transform rotate-6"
                  variants={itemVariants}
                  whileHover={{ scale: 1.05, transition: { duration: 0.3 } }}
                  animate={
                    prefersReducedMotion
                      ? {}
                      : {
                          rotate: [6, 7, 6],
                          y: [0, -5, 0],
                          transition: {
                            duration: 9,
                            repeat: Infinity,
                            repeatType: "reverse",
                            delay: 1,
                          },
                        }
                  }
                >
                  <Image
                    src="https://simpleprojexbucket.s3.us-west-1.amazonaws.com/static/landing/prop.png"
                    alt="Modern bathroom"
                    fill
                    className="object-cover"
                  />
                </motion.div>

                {/* Fourth image */}
                <motion.div
                  className="absolute bottom-10 left-10 w-2/5 h-1/3 rounded-lg overflow-hidden border-4 border-white shadow-xl z-10 transform -rotate-6"
                  variants={itemVariants}
                  whileHover={{ scale: 1.05, transition: { duration: 0.3 } }}
                  animate={
                    prefersReducedMotion
                      ? {}
                      : {
                          rotate: [-6, -7.5, -6],
                          y: [0, 5, 0],
                          transition: {
                            duration: 8,
                            repeat: Infinity,
                            repeatType: "reverse",
                            delay: 1.5,
                          },
                        }
                  }
                >
                  <Image
                    src="https://simpleprojexbucket.s3.us-west-1.amazonaws.com/static/landing/te.png"
                    alt="Modern bedroom"
                    fill
                    className="object-cover"
                  />
                </motion.div>

                {/* Fifth image */}
                <motion.div
                  className="absolute top-1/3 right-1/4 w-1/3 h-1/4 rounded-lg overflow-hidden border-4 border-white shadow-xl z-0 transform rotate-12"
                  variants={itemVariants}
                  whileHover={{ scale: 1.05, transition: { duration: 0.3 } }}
                  animate={
                    prefersReducedMotion
                      ? {}
                      : {
                          rotate: [12, 14, 12],
                          transition: {
                            duration: 10,
                            repeat: Infinity,
                            repeatType: "reverse",
                            delay: 2,
                          },
                        }
                  }
                >
                  <Image
                    src="https://i.ibb.co/ynDY5rQF/img3.webp"
                    alt="Modern living area"
                    fill
                    className="object-cover"
                  />
                </motion.div>

                {/* Play button overlay with improved animations */}                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-40">
                  <motion.button
                    className="group relative"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setVideoModalOpen(true)}
                  >
                    {/* Outer rings with improved animation */}
                    <motion.div
                      className="absolute -inset-10 rounded-full border-2 border-white/20 opacity-20"
                      animate={{
                        scale: [1, 1.1, 1],
                        opacity: [0.2, 0.3, 0.2],
                      }}
                      transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        repeatType: "reverse",
                      }}
                    ></motion.div>
                    <motion.div
                      className="absolute -inset-7 rounded-full border border-white/40"
                      animate={{
                        scale: [1, 1.05, 1],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        repeatType: "reverse",
                        delay: 0.5,
                      }}
                    ></motion.div>

                    {/* Button background with enhanced hover effect */}
                    <motion.div
                      className="relative bg-white/90 backdrop-blur-sm rounded-full p-5 group-hover:bg-white transition-all duration-300 shadow-lg"
                      whileHover={{
                        boxShadow: "0 0 15px 5px rgba(255, 255, 255, 0.3)",
                      }}
                    >
                      <Play
                        className="h-10 w-10 text-primary"
                        style={{ color: "hsl(0, 85%, 30%)" }}
                      />
                    </motion.div>

                    {/* Label with animation */}
                    <motion.span
                      className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full text-primary font-bold shadow-lg"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1 }}
                      style={{ color: "hsl(0, 85%, 30%)" }}
                    >
                      Watch Demo
                    </motion.span>
                  </motion.button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Video Modal */}
      {videoModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setVideoModalOpen(false)}
        >
          <div 
            className="relative w-full max-w-4xl bg-white rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setVideoModalOpen(false)}
              className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="aspect-video">
              <iframe
                src="https://www.youtube.com/embed/boRuZyMTPPk?autoplay=1&rel=0"
                title="Simple ProjeX Demo"
                className="w-full h-full"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HeroSection;