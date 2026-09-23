"use client";

import { useEffect, useRef, useState } from "react";
import { loadApprovedBudgetProjectSourceAction } from "@/features/projects/actions";
import type { ApprovedBudgetProjectSource } from "@/features/projects/approved-budget-source";

export function useApprovedBudgetSource({
  initialBudgetRequestId,
  isExisting,
  onApply,
}: {
  initialBudgetRequestId: string;
  isExisting: boolean;
  onApply: (source: ApprovedBudgetProjectSource) => void;
}) {
  const [budgetRequestId, setBudgetRequestId] = useState(initialBudgetRequestId);
  const [mode, setMode] = useState<"approved" | "manual">(isExisting ? "manual" : "approved");
  const [replacementId, setReplacementId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loadedCode, setLoadedCode] = useState("");
  const modified = useRef(isExisting);
  const sequence = useRef(0);

  useEffect(
    () => () => {
      sequence.current += 1;
    },
    [],
  );

  function cancel() {
    sequence.current += 1;
    setLoading(false);
    setReplacementId(null);
    setError("");
  }

  async function applySelection(id: string) {
    const request = ++sequence.current;
    setReplacementId(null);
    setError("");
    if (!id) {
      setBudgetRequestId("");
      setMode("manual");
      setLoadedCode("");
      setWarnings([]);
      return;
    }
    setLoading(true);
    try {
      const result = await loadApprovedBudgetProjectSourceAction(id);
      if (request !== sequence.current) return;
      if (!result.success) {
        setError(result.error);
        return;
      }
      onApply(result.data);
      setBudgetRequestId(result.data.budgetRequestId);
      setMode("approved");
      setLoadedCode(result.data.code);
      setWarnings(result.data.warnings);
      modified.current = false;
    } catch {
      if (request === sequence.current) {
        setError("โหลดคำของบไม่สำเร็จ ข้อมูลเดิมยังอยู่ กรุณาตรวจการเชื่อมต่อแล้วเลือกอีกครั้ง");
      }
    } finally {
      if (request === sequence.current) setLoading(false);
    }
  }

  function select(id: string) {
    if (loading) return;
    if (modified.current || budgetRequestId) {
      setError("");
      setReplacementId(id);
    } else {
      void applySelection(id);
    }
  }

  return {
    budgetRequestId,
    mode,
    replacementId,
    loading,
    error,
    warnings,
    loadedCode,
    busy: loading || replacementId !== null,
    markModified: () => {
      modified.current = true;
    },
    select,
    useApprovedMode: () => {
      setMode("approved");
      setError("");
    },
    confirm: () => {
      if (replacementId !== null) void applySelection(replacementId);
    },
    cancel,
  };
}

export type ApprovedBudgetSourceControl = ReturnType<typeof useApprovedBudgetSource>;
