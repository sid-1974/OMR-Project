export const drawResizeHandles = (ctx, target, color) => {
  ctx.fillStyle = color;
  const handleSize = 6;
  const half = handleSize / 2;
  // Corners
  ctx.fillRect(target.x - half, target.y - half, handleSize, handleSize);
  ctx.fillRect(target.x + target.width - half, target.y - half, handleSize, handleSize);
  ctx.fillRect(target.x - half, target.y + target.height - half, handleSize, handleSize);
  ctx.fillRect(target.x + target.width - half, target.y + target.height - half, handleSize, handleSize);
  // Midpoints
  ctx.fillRect(target.x + target.width / 2 - half, target.y - half, handleSize, handleSize); // Top
  ctx.fillRect(target.x + target.width / 2 - half, target.y + target.height - half, handleSize, handleSize); // Bottom
  ctx.fillRect(target.x - half, target.y + target.height / 2 - half, handleSize, handleSize); // Left
  ctx.fillRect(target.x + target.width - half, target.y + target.height / 2 - half, handleSize, handleSize); // Right
};

export const drawAnchorsOverlay = (ctx, anchors, activeTab) => {
  if ((!anchors.type || anchors.type === '4_corners') && activeTab === 'anchors') {
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'].forEach((key) => {
      const pt = anchors[key];
      if(!pt) return;
      // Draw square bounding box around anchor
      ctx.strokeRect(pt.x - 12, pt.y - 12, 24, 24);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4, 0, 2 * Math.PI);
      ctx.fillStyle = '#ef4444';
      ctx.fill();
    });
  }
};

export const drawTimingMarksOverlay = (ctx, anchors, timingMarksConfig, activeTab) => {
  if (anchors.type === 'timing_marks' && (activeTab === 'all' || activeTab === 'anchors')) {
    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 1.5;

    ['left', 'right'].forEach(side => {
      const tm = timingMarksConfig[side];
      ctx.strokeRect(tm.x, tm.y, tm.width, tm.height);
      
      ctx.fillStyle = 'rgba(236, 72, 153, 0.2)';
      ctx.fillText(`${side === 'left' ? 'Left' : 'Right'} Timing Track`, tm.x, tm.y - 6);

      // Draw individual marks
      const spacing = tm.height / (tm.count - 1 || 1);
      ctx.fillStyle = 'rgba(236, 72, 153, 0.5)';
      for (let i = 0; i < tm.count; i++) {
        const markY = tm.y + i * spacing;
        ctx.fillRect(tm.x, markY - 2, tm.width, 4);
      }

      if (activeTab === 'anchors') {
        drawResizeHandles(ctx, tm, '#ec4899');
      }
    });
  }
};

export const drawRegNoOverlay = (ctx, regNoBlocks, activeRegBlockId, activeTab, getRegNoBubbles) => {
  if (activeTab === 'all' || activeTab === 'regno') {
    regNoBlocks.forEach(block => {
      if (!block.enabled) return;
      const isActive = Number(block.id) === Number(activeRegBlockId) && activeTab === 'regno';
      ctx.strokeStyle = isActive ? '#06b6d4' : 'rgba(6, 182, 212, 0.4)';
      ctx.lineWidth = isActive ? 2 : 1.5;

      // Draw outer bounding box
      ctx.strokeRect(block.x, block.y, block.width, block.height);
      ctx.fillStyle = isActive ? 'rgba(6, 182, 212, 0.5)' : 'rgba(6, 182, 212, 0.2)';
      ctx.fillText(`Student Regno Grid (Block ${block.id})`, block.x, block.y - 6);

      const bubbles = getRegNoBubbles(block);
      bubbles.forEach(b => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, 2 * Math.PI);
        ctx.stroke();
      });

      if (isActive) {
        drawResizeHandles(ctx, block, '#06b6d4');
      }
    });
  }
};

export const drawQPCodeOverlay = (ctx, qpCodeConfig, activeTab, getRegNoBubbles) => {
  if (qpCodeConfig.enabled && (activeTab === 'all' || activeTab === 'qpcode')) {
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;

    // Draw outer bounding box
    ctx.strokeRect(qpCodeConfig.x, qpCodeConfig.y, qpCodeConfig.width, qpCodeConfig.height);
    ctx.fillStyle = 'rgba(245, 158, 11, 0.2)';
    ctx.fillText('QP Code Grid', qpCodeConfig.x, qpCodeConfig.y - 6);

    const bubbles = getRegNoBubbles(qpCodeConfig);
    bubbles.forEach(b => {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, 2 * Math.PI);
      ctx.stroke();
    });

    if (activeTab === 'qpcode') {
      drawResizeHandles(ctx, qpCodeConfig, '#f59e0b');
    }
  }
};

export const drawSheetNoOverlay = (ctx, sheetNoConfig, activeTab) => {
  if (sheetNoConfig.enabled && (activeTab === 'all' || activeTab === 'sheetno')) {
    if (sheetNoConfig.mode === 'barcode') {
      ctx.strokeStyle = '#8b5cf6';
      ctx.lineWidth = 2;

      // Draw outer bounding box
      ctx.strokeRect(sheetNoConfig.x, sheetNoConfig.y, sheetNoConfig.width, sheetNoConfig.height);
      ctx.fillStyle = '#8b5cf6';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('Barcode / QR Code Area', sheetNoConfig.x, sheetNoConfig.y - 6);

      if (activeTab === 'sheetno') {
        drawResizeHandles(ctx, sheetNoConfig, '#8b5cf6');
      }
    }
  }
};

export const drawQuestionsOverlay = (ctx, questionBlocks, activeQBlockId, activeTab, getQuestionBlockBubbles) => {
  if (activeTab === 'all' || activeTab === 'questions') {
    questionBlocks.forEach(block => {
      const isActive = Number(block.id) === Number(activeQBlockId) && activeTab === 'questions';
      ctx.strokeStyle = isActive ? '#10b981' : 'rgba(16, 185, 129, 0.4)';
      ctx.lineWidth = isActive ? 2 : 1;

      ctx.strokeRect(block.x, block.y, block.width, block.height);
      ctx.font = '10px Outfit';
      ctx.fillStyle = isActive ? '#10b981' : 'rgba(16, 185, 129, 0.7)';
      ctx.fillText(`${block.name} (Q${block.startQ}-Q${block.startQ + block.qCount - 1})`, block.x, block.y - 6);

      const bubbles = getQuestionBlockBubbles(block);
      bubbles.forEach(b => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, 2 * Math.PI);
        ctx.stroke();

        // Draw tiny text label for first options/row numbers to verify
        if (b.label === 'A' || b.qNum === block.startQ) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.fillText(b.label, b.x - 3, b.y + 3);
        }
      });

      if (isActive) {
        drawResizeHandles(ctx, block, '#10b981');
      }
    });
  }
};
