"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Brain, CalendarDays, GraduationCap, LineChart, Sparkles, UsersRound, Utensils } from "lucide-react";
import { useState } from "react";

const nodes = [
  { label: "Students", detail: "Verified activity profiles", icon: UsersRound, x: 48, y: 7 },
  { label: "Events", detail: "Registration, passes, certificates", icon: CalendarDays, x: 83, y: 31 },
  { label: "Clubs", detail: "Communities and approvals", icon: Sparkles, x: 71, y: 76 },
  { label: "Faculty", detail: "Departments and mentoring", icon: GraduationCap, x: 25, y: 78 },
  { label: "AI", detail: "Context-aware campus assistant", icon: Brain, x: 8, y: 35 },
  { label: "Mess", detail: "Food, hostel, services", icon: Utensils, x: 18, y: 13 },
  { label: "Analytics", detail: "Cross-college insights", icon: LineChart, x: 88, y: 62 },
] as const;

export function CampusNetwork() {
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState<(typeof nodes)[number] | null>(nodes[1]);

  return (
    <motion.div
      className="network-shell"
      initial={reduceMotion ? false : { opacity: 0, rotateX: 8, y: 22 }}
      animate={reduceMotion ? undefined : { opacity: 1, rotateX: 0, y: 0 }}
      transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="network-orbit" aria-hidden="true" />
      <div className="network-orbit secondary" aria-hidden="true" />
      <div className="network-lines" aria-hidden="true">
        {nodes.map((node) => (
          <span
            key={node.label}
            style={{
              left: `${Math.min(node.x, 50)}%`,
              top: `${Math.min(node.y, 50)}%`,
              width: `${Math.abs(node.x - 50) + 14}%`,
              transform: `rotate(${Math.atan2(node.y - 50, node.x - 50)}rad)`,
            }}
          />
        ))}
      </div>
      <div className="core-sphere">
        <span>UniSphere</span>
        <small>Campus OS</small>
      </div>
      {nodes.map((node) => {
        const Icon = node.icon;
        const isActive = active?.label === node.label;
        return (
          <button
            type="button"
            key={node.label}
            className={`network-node ${isActive ? "active" : ""}`}
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
            onMouseEnter={() => setActive(node)}
            onFocus={() => setActive(node)}
          >
            <Icon size={16} aria-hidden="true" />
            <span>{node.label}</span>
          </button>
        );
      })}
      <div className="network-detail" aria-live="polite">
        <span>{active?.label ?? "UniSphere"}</span>
        <p>{active?.detail ?? "A connected campus ecosystem."}</p>
      </div>
    </motion.div>
  );
}
