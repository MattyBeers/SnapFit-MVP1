import React, { useRef, useState, useEffect } from 'react';
import { createClosetItem } from '../lib/api/closet';

// Simple mesh-based garment aligner
// - Loads an image file
// - Creates a regular grid of control points (mesh)
// - Allows dragging control points to warp the garment
// - Renders warped result to canvas and exports as dataURL

export default function GarmentAligner({ user }) {
  const [imageSrc, setImageSrc] = useState(null);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const [gridW] = useState(8); // horizontal subdivisions
  const [gridH] = useState(8); // vertical subdivisions
  const [points, setPoints] = useState([]); // [{x,y}] in image coords
  const [dragIndex, setDragIndex] = useState(-1);

  // Load selected file
  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImageSrc(url);
  }

  // initialize mesh when image loads
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;
      setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
      initGrid(img.naturalWidth, img.naturalHeight);
      draw();
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // initialize grid points
  function initGrid(w, h) {
    const pts = [];
    for (let j = 0; j <= gridH; j++) {
      for (let i = 0; i <= gridW; i++) {
        pts.push({ x: (i / gridW) * w, y: (j / gridH) * h });
      }
    }
    setPoints(pts);
  }

  // convert 2D index
  function idx(i, j) { return j * (gridW + 1) + i; }

  // Draw warped mesh by splitting each cell into two triangles
  function draw() {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || points.length === 0) return;
    const ctx = canvas.getContext('2d');
    canvas.width = imgSize.w;
    canvas.height = imgSize.h;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // For each cell, draw two triangles
    for (let j = 0; j < gridH; j++) {
      for (let i = 0; i < gridW; i++) {
        const p00 = points[idx(i, j)];
        const p10 = points[idx(i+1, j)];
        const p01 = points[idx(i, j+1)];
        const p11 = points[idx(i+1, j+1)];

        // Source triangle 1 (top-left)
        const sx0 = (i / gridW) * imgSize.w; const sy0 = (j / gridH) * imgSize.h;
        const sx1 = ((i+1) / gridW) * imgSize.w; const sy1 = (j / gridH) * imgSize.h;
        const sx2 = (i / gridW) * imgSize.w; const sy2 = ((j+1) / gridH) * imgSize.h;

        drawTriangle(ctx, img, sx0, sy0, sx1, sy1, sx2, sy2, p00.x, p00.y, p10.x, p10.y, p01.x, p01.y);

        // Source triangle 2 (bottom-right)
        const sx3 = ((i+1) / gridW) * imgSize.w; const sy3 = ((j+1) / gridH) * imgSize.h;
        drawTriangle(ctx, img, sx3, sy3, sx1, sy1, sx2, sy2, p11.x, p11.y, p10.x, p10.y, p01.x, p01.y);
      }
    }

    // draw control points
    ctx.fillStyle = 'rgba(255,64,129,0.95)';
    for (let k = 0; k < points.length; k++) {
      const p = points[k];
      ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI*2); ctx.fill();
    }
  }

  // Solve affine transform mapping src triangle -> dst triangle and render with clipping
  function drawTriangle(ctx, img, sx0, sy0, sx1, sy1, sx2, sy2, dx0, dy0, dx1, dy1, dx2, dy2) {
    ctx.save();
    // create path for destination triangle and clip
    ctx.beginPath();
    ctx.moveTo(dx0, dy0);
    ctx.lineTo(dx1, dy1);
    ctx.lineTo(dx2, dy2);
    ctx.closePath();
    ctx.clip();

    // compute affine transform
    // Solve linear system A * params = B for params = [a,c,e; b,d,f]
    const srcMat = [
      [sx0, sy0, 1, 0, 0, 0],
      [0, 0, 0, sx0, sy0, 1],
      [sx1, sy1, 1, 0, 0, 0],
      [0, 0, 0, sx1, sy1, 1],
      [sx2, sy2, 1, 0, 0, 0],
      [0, 0, 0, sx2, sy2, 1],
    ];
    const B = [dx0, dy0, dx1, dy1, dx2, dy2];
    // Solve using gaussian elimination
    const params = solveLinearSystem6(srcMat, B); // [a,c,e,b,d,f]
    if (!params) { ctx.restore(); return; }
    const a = params[0], c = params[1], e = params[2], b = params[3], d = params[4], f = params[5];

    // set transform and draw full image; clipping keeps only triangle
    ctx.setTransform(a, b, c, d, e, f);
    ctx.drawImage(img, 0, 0);
    ctx.setTransform(1,0,0,1,0,0);
    ctx.restore();
  }

  // Simple gaussian elimination for 6x6 linear system
  function solveLinearSystem6(A, B) {
    // build augmented matrix
    const M = A.map((row, i) => row.concat([B[i]]));
    const n = 6;
    for (let i = 0; i < n; i++) {
      // pivot
      let maxRow = i;
      for (let r = i+1; r < n; r++) if (Math.abs(M[r][i]) > Math.abs(M[maxRow][i])) maxRow = r;
      if (Math.abs(M[maxRow][i]) < 1e-9) return null;
      const tmp = M[i]; M[i] = M[maxRow]; M[maxRow] = tmp;
      // normalize
      const piv = M[i][i];
      for (let c = i; c <= n; c++) M[i][c] /= piv;
      // eliminate
      for (let r = 0; r < n; r++) {
        if (r === i) continue;
        const factor = M[r][i];
        for (let c = i; c <= n; c++) M[r][c] -= factor * M[i][c];
      }
    }
    return M.map(row => row[n]);
  }

  // Mouse handlers for dragging control points
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    let rect = null;
    function toCanvasPos(e) { rect = canvas.getBoundingClientRect(); return { x: (e.clientX - rect.left) * (canvas.width / rect.width), y: (e.clientY - rect.top) * (canvas.height / rect.height) }; }

    function onDown(e) {
      const pos = toCanvasPos(e);
      // find nearest point
      let nearest = -1; let best = 16;
      for (let k = 0; k < points.length; k++) {
        const p = points[k];
        const dx = p.x - pos.x, dy = p.y - pos.y; const d = Math.hypot(dx,dy);
        if (d < best) { best = d; nearest = k; }
      }
      if (nearest >= 0) setDragIndex(nearest);
    }
    function onMove(e) {
      if (dragIndex < 0) return;
      const pos = toCanvasPos(e);
      setPoints(prev => {
        const next = prev.map(p => ({...p}));
        next[dragIndex] = { x: Math.max(0, Math.min(imgSize.w, pos.x)), y: Math.max(0, Math.min(imgSize.h, pos.y)) };
        return next;
      });
    }
    function onUp() { setDragIndex(-1); }

    canvas.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    // touch
    canvas.addEventListener('touchstart', (ev)=> { if (ev.touches[0]) onDown(ev.touches[0]); ev.preventDefault(); });
    window.addEventListener('touchmove', (ev)=> { if (ev.touches && ev.touches[0]) onMove(ev.touches[0]); }, { passive: false });
    window.addEventListener('touchend', onUp);

    return () => {
      canvas.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      canvas.removeEventListener('touchstart', ()=>{});
      window.removeEventListener('touchmove', ()=>{});
      window.removeEventListener('touchend', ()=>{});
    };
  }, [points, dragIndex, imgSize]);

  // redraw when points change
  useEffect(() => { draw(); }, [points]);

  // export warped image and create closet item
  async function exportAndCreate() {
    const canvas = canvasRef.current; if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    try {
      await createClosetItem({ name: 'Auto-added garment', type: 'unknown', color: 'unknown', image_url: dataUrl });
      alert('Garment added to closet');
    } catch (e) {
      console.error(e); alert('Failed to add item');
    }
  }

  return (
    <div style={{ maxWidth: 980 }}>
      <div style={{ marginBottom: 12 }}>
        <input type="file" accept="image/*" onChange={handleFile} />
      </div>

      {imageSrc && (
        <div style={{ position: 'relative', display: 'inline-block', border: '1px solid var(--sf-border)' }}>
          <canvas ref={canvasRef} style={{ maxWidth: '100%', touchAction: 'none' }} />
        </div>
      )}

      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        <button className="sf-btn sf-btn-primary" onClick={exportAndCreate} disabled={!imageSrc}>Export & Add to Closet</button>
        <button className="sf-btn sf-btn-outline" onClick={() => { if (imageSrc) { initGrid(imgSize.w, imgSize.h); draw(); } }}>Reset Mesh</button>
      </div>
    </div>
  );
}
