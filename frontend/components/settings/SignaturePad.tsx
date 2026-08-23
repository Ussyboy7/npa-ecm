"use client";

import { useRef, useState, useCallback, type FC, type PointerEvent as ReactPointerEvent } from 'react';
import { SIGNATURE_INK } from '@/lib/theme-colors';
import { Button } from '@/components/ui/button';
import { Undo2, Trash2 } from 'lucide-react';

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
}

interface Point {
  x: number;
  y: number;
}

export const SignaturePad: FC<SignaturePadProps> = ({ onSave }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const strokesRef = useRef<Point[][]>([]);
  const currentStrokeRef = useRef<Point[]>([]);
  const lastPointRef = useRef<Point | null>(null);

  const getPoint = useCallback((e: ReactPointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }, []);

  const drawStroke = useCallback((ctx: CanvasRenderingContext2D, points: Point[]) => {
    if (points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const p = points[i - 1];
      const c = points[i];
      ctx.quadraticCurveTo(p.x, p.y, (p.x + c.x) / 2, (p.y + c.y) / 2);
    }
    ctx.stroke();
  }, []);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = SIGNATURE_INK;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const stroke of strokesRef.current) {
      drawStroke(ctx, stroke);
    }
  }, [drawStroke]);

  const handlePointerDown = useCallback((e: ReactPointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsDrawing(true);
    const point = getPoint(e);
    currentStrokeRef.current = [point];
    lastPointRef.current = point;
  }, [getPoint]);

  const handlePointerMove = useCallback((e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const point = getPoint(e);
    currentStrokeRef.current.push(point);

    const ctx = canvasRef.current!.getContext('2d')!;
    ctx.strokeStyle = SIGNATURE_INK;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (lastPointRef.current) {
      const mid = {
        x: (lastPointRef.current.x + point.x) / 2,
        y: (lastPointRef.current.y + point.y) / 2,
      };
      ctx.beginPath();
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
      ctx.quadraticCurveTo(lastPointRef.current.x, lastPointRef.current.y, mid.x, mid.y);
      ctx.stroke();
    }
    lastPointRef.current = point;
  }, [isDrawing, getPoint]);

  const handlePointerUp = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentStrokeRef.current.length > 0) {
      strokesRef.current.push([...currentStrokeRef.current]);
      currentStrokeRef.current = [];
      lastPointRef.current = null;
      setHasDrawn(true);
    }
  }, [isDrawing]);

  const handleUndo = useCallback(() => {
    strokesRef.current.pop();
    redraw();
    if (strokesRef.current.length === 0) setHasDrawn(false);
  }, [redraw]);

  const handleClear = useCallback(() => {
    strokesRef.current = [];
    redraw();
    setHasDrawn(false);
  }, [redraw]);

  const handleSave = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let minX = canvas.width;
    let minY = canvas.height;
    let maxX = 0;
    let maxY = 0;
    let found = false;
    for (let i = 0; i < imageData.data.length; i += 4) {
      if (imageData.data[i + 3] > 0) {
        found = true;
        const x = (i / 4) % canvas.width;
        const y = Math.floor(i / 4 / canvas.width);
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
    if (!found) return;

    const pad = 20;
    const sx = Math.max(0, minX - pad);
    const sy = Math.max(0, minY - pad);
    const ex = Math.min(canvas.width, maxX + pad + 1);
    const ey = Math.min(canvas.height, maxY + pad + 1);
    const sw = Math.max(1, ex - sx);
    const sh = Math.max(1, ey - sy);

    // Transparent PNG so the seal composites cleanly (no white box)
    const trimmed = document.createElement('canvas');
    trimmed.width = sw;
    trimmed.height = sh;
    const tCtx = trimmed.getContext('2d')!;
    tCtx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
    onSave(trimmed.toDataURL('image/png'));
  }, [onSave]);

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-lg border bg-white">
        <canvas
          ref={canvasRef}
          width={800}
          height={300}
          className="w-full h-[200px] touch-none cursor-crosshair"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
        {!hasDrawn && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-sm text-muted-foreground">Draw your signature here</p>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleUndo} disabled={!hasDrawn}>
          <Undo2 className="h-3.5 w-3.5 mr-1" />
          Undo
        </Button>
        <Button variant="outline" size="sm" onClick={handleClear} disabled={!hasDrawn}>
          <Trash2 className="h-3.5 w-3.5 mr-1" />
          Clear
        </Button>
        <div className="flex-1" />
        <Button size="sm" onClick={handleSave} disabled={!hasDrawn}>
          Save signature
        </Button>
      </div>
    </div>
  );
};
