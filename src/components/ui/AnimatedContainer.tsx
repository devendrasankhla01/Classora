import { useEffect, useState, type ReactNode } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

import { cn } from '@/lib/cn';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

/**
  Smooth spring page transition wrapper
 */
export function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -12, filter: 'blur(2px)' }}
      transition={{
        duration: 0.38,
        ease: [0.16, 1, 0.3, 1], // Natural spring-like easing
      }}
      className={cn('w-full', className)}
    >
      {children}
    </motion.div>
  );
}

interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
  delay?: number;
}

/**
  Staggered container wrapper for lists, cards, and grid items
 */
export function StaggerContainer({
  children,
  className,
  staggerDelay = 0.06,
  delay = 0,
}: StaggerContainerProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            delayChildren: delay,
            staggerChildren: staggerDelay,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface StaggerItemProps {
  children: ReactNode;
  className?: string;
  whileHoverScale?: number;
  whileHoverY?: number;
}

/**
  Individual staggered item with gentle upward fade + hover spring interaction
 */
export function StaggerItem({
  children,
  className,
  whileHoverScale = 1.01,
  whileHoverY = -3,
}: StaggerItemProps) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 18, filter: 'blur(2px)' },
        visible: {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          transition: {
            duration: 0.42,
            ease: [0.16, 1, 0.3, 1],
          },
        },
      }}
      whileHover={{
        scale: whileHoverScale,
        y: whileHoverY,
        transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] },
      }}
      whileTap={{
        scale: 0.985,
        y: 0,
        transition: { duration: 0.12 },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface AnimatedCounterProps {
  value: number | null;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}

/**
  Smooth spring animated number counter (e.g., percentage, counts)
 */
export function AnimatedCounter({
  value,
  decimals = 0,
  suffix = '',
  prefix = '',
  className,
}: AnimatedCounterProps) {
  const numericValue = value ?? 0;
  const spring = useSpring(0, {
    mass: 0.8,
    stiffness: 75,
    damping: 15,
  });

  const display = useTransform(spring, (current) => {
    return `${prefix}${current.toFixed(decimals)}${suffix}`;
  });

  const [displayValue, setDisplayValue] = useState(`${prefix}${numericValue.toFixed(decimals)}${suffix}`);

  useEffect(() => {
    spring.set(numericValue);
  }, [spring, numericValue]);

  useEffect(() => {
    const unsubscribe = display.on('change', (latest) => {
      setDisplayValue(latest);
    });
    return () => unsubscribe();
  }, [display]);

  return <span className={className}>{displayValue}</span>;
}

interface AnimatedProgressBarProps {
  percentage: number;
  className?: string;
  barGradient?: string;
}

/**
  Smooth spring progress bar component
 */
export function AnimatedProgressBar({
  percentage,
  className,
  barGradient = 'bg-gradient-to-r from-[#38b6ff] to-[#0094e8]',
}: AnimatedProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, percentage));

  return (
    <div className={cn('h-2.5 w-full overflow-hidden rounded-full neu-sunken p-0.5', className)}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{
          duration: 0.8,
          ease: [0.16, 1, 0.3, 1],
          delay: 0.1,
        }}
        className={cn('h-full rounded-full shadow-sm', barGradient)}
      />
    </div>
  );
}

interface FloatingCardProps {
  children: ReactNode;
  className?: string;
  floatOffset?: number;
  duration?: number;
}

/**
  Gentle floating card wrapper with slow, elegant up-and-down ambient motion
 */
export function FloatingCard({
  children,
  className,
  floatOffset = 4,
  duration = 5.5,
}: FloatingCardProps) {
  return (
    <motion.div
      animate={{
        y: [0, -floatOffset, 0],
      }}
      transition={{
        duration,
        repeat: Infinity,
        repeatType: 'reverse',
        ease: 'easeInOut',
      }}
      whileHover={{
        scale: 1.015,
        y: -floatOffset - 2,
        transition: { type: 'spring', stiffness: 400, damping: 25 },
      }}
      whileTap={{ scale: 0.985 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
