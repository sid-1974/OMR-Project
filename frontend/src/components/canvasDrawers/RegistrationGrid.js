export const drawRegistrationGrid = (ctx, regConfig) => {
  if (regConfig) {
    if (typeof regConfig === 'string') regConfig = JSON.parse(regConfig);
    if (regConfig.enabled) {
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      ctx.strokeRect(regConfig.x, regConfig.y, regConfig.width, regConfig.height);

      const colSpacing = regConfig.width / (regConfig.columns - 1 || 1);
      const rowSpacing = regConfig.height / (regConfig.rows - 1 || 1);
      for (let col = 0; col < regConfig.columns; col++) {
        const x = regConfig.x + col * colSpacing;
        for (let row = 0; row < regConfig.rows; row++) {
          const y = regConfig.y + row * rowSpacing;
          ctx.beginPath();
          ctx.arc(x, y, regConfig.bubbleRadius || 8, 0, 2 * Math.PI);
          ctx.stroke();
        }
      }
    }
  }
};
