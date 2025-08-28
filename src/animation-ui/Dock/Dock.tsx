"use client";

import {
  motion,
  MotionValue,
  useMotionValue,
  useSpring,
  useTransform,
  type SpringOptions,
  AnimatePresence,
} from "motion/react";
import React, { Children, useEffect, useRef, useState } from "react";

export type DockItemData = {
  icon: React.ReactNode;
  label: React.ReactNode;
  onClick: () => void;
  className?: string;
};

export type DockProps = {
  items: DockItemData[];
  className?: string;
  distance?: number;
  panelHeight?: number;
  baseItemSize?: number;
  dockHeight?: number;
  magnification?: number;
  spring?: SpringOptions;
};

type DockItemProps = {
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  mouseX: MotionValue;
  distance: number;
  baseItemSize: number;
  magnification: number;
};

function DockItem({
  children,
  className = "",
  onClick,
  mouseX,
  distance,
  magnification,
  baseItemSize,
}: DockItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isHovered = useMotionValue(0);

  const mouseDistance = useTransform(mouseX, (val) => {
    if (!ref.current || val === Infinity) {
      return distance + 1;
    }

    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.x + rect.width / 2;
    return Math.abs(val - centerX);
  });

  const targetSize = useTransform(
    mouseDistance,
    [0, distance / 3, distance],
    [magnification, baseItemSize + 15, baseItemSize],
    { clamp: true }
  );

  const size = useSpring(targetSize, {
    stiffness: 300,
    damping: 25,
    mass: 0.6,
  });

  return (
    <motion.div
      ref={ref}
      style={{
        width: size,
        height: size,
        transformOrigin: "bottom center", // This ensures scaling happens upward from the bottom
      }}
      onHoverStart={() => isHovered.set(1)}
      onHoverEnd={() => isHovered.set(0)}
      onFocus={() => isHovered.set(1)}
      onBlur={() => isHovered.set(0)}
      onClick={onClick}
      className={`relative inline-flex items-center justify-center rounded-xl bg-white/10 border-white/20 border backdrop-blur-sm shadow-lg cursor-pointer transition-all duration-200 hover:bg-white/15 hover:border-white/30 ${className}`}
      tabIndex={0}
      role='button'
      aria-haspopup='true'
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { isHovered } as any);
        }
        return child;
      })}
    </motion.div>
  );
}

type DockLabelProps = {
  className?: string;
  children: React.ReactNode;
};

function DockLabel({ children, className = "", ...rest }: DockLabelProps) {
  const { isHovered } = rest as { isHovered: MotionValue<number> };
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = isHovered.on("change", (latest) => {
      setIsVisible(latest === 1);
    });
    return () => unsubscribe();
  }, [isHovered]);

  return (
    <AnimatePresence mode='wait'>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: -15, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.9 }}
          transition={{
            duration: 0.15,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
          className={`${className} absolute -top-12 left-1/2 w-fit whitespace-nowrap rounded-lg border border-white/20 bg-black/80 backdrop-blur-md px-3 py-1.5 text-xs text-white shadow-xl`}
          role='tooltip'
          style={{ x: "-50%" }}
        >
          {children}
          <div className='absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-black/80' />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

type DockIconProps = {
  className?: string;
  children: React.ReactNode;
};

function DockIcon({ children, className = "" }: DockIconProps) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      {children}
    </div>
  );
}

export default function Dock({
  items,
  className = "",
  magnification = 70,
  distance = 200,
  panelHeight = 64,
  baseItemSize = 50,
}: DockProps) {
  const mouseX = useMotionValue(Infinity);

  const containerHeight = Math.max(panelHeight, magnification + 40);

  return (
    <div className='fixed bottom-0 left-0 right-0 flex justify-center pointer-events-none z-50 pb-4'>
      <div
        style={{ height: containerHeight }}
        className='flex items-end justify-center'
      >
        <motion.div
          onMouseMove={({ pageX }) => {
            mouseX.set(pageX);
          }}
          onMouseLeave={() => {
            mouseX.set(Infinity);
          }}
          className={`${className} flex items-end w-fit gap-3 rounded-2xl border-neutral-700/50 border backdrop-blur-xl bg-black/30 pb-3 px-4 pointer-events-auto shadow-2xl`}
          style={{ height: panelHeight }}
          role='toolbar'
          aria-label='Application dock'
        >
          {items.map((item, index) => (
            <DockItem
              key={index}
              onClick={item.onClick}
              className={item.className}
              mouseX={mouseX}
              distance={distance}
              magnification={magnification}
              baseItemSize={baseItemSize}
            >
              <DockIcon>{item.icon}</DockIcon>
              <DockLabel>{item.label}</DockLabel>
            </DockItem>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
