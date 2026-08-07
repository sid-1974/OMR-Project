export const drawQPCodeGrid = (ctx, qpcodeConfig) => {
  if (qpcodeConfig) {
    if (typeof qpcodeConfig === 'string') qpcodeConfig = JSON.parse(qpcodeConfig);
    if (qpcodeConfig.enabled) {
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 2;
      ctx.strokeRect(qpcodeConfig.x, qpcodeConfig.y, qpcodeConfig.width, qpcodeConfig.height);

      const colSpacing = qpcodeConfig.width / (qpcodeConfig.columns - 1 || 1);
      const rowSpacing = qpcodeConfig.height / (qpcodeConfig.rows - 1 || 1);
      for (let col = 0; col < qpcodeConfig.columns; col++) {
        const x = qpcodeConfig.x + col * colSpacing;
        for (let row = 0; row < qpcodeConfig.rows; row++) {
          const y = qpcodeConfig.y + row * rowSpacing;
          ctx.beginPath();
          ctx.arc(x, y, qpcodeConfig.bubbleRadius || 8, 0, 2 * Math.PI);
          ctx.stroke();
        }
      }
    }
  }
};
