export const drawSheetNoGrid = (ctx, sheetConfig) => {
  if (sheetConfig) {
    if (typeof sheetConfig === 'string') sheetConfig = JSON.parse(sheetConfig);
    if (sheetConfig.enabled && (sheetConfig.mode === 'bubble_grid' || !sheetConfig.mode)) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.strokeRect(sheetConfig.x, sheetConfig.y, sheetConfig.width, sheetConfig.height);

      const colSpacing = sheetConfig.width / (sheetConfig.columns - 1 || 1);
      const rowSpacing = sheetConfig.height / (sheetConfig.rows - 1 || 1);
      for (let col = 0; col < sheetConfig.columns; col++) {
        const x = sheetConfig.x + col * colSpacing;
        for (let row = 0; row < sheetConfig.rows; row++) {
          const y = sheetConfig.y + row * rowSpacing;
          ctx.beginPath();
          ctx.arc(x, y, sheetConfig.bubbleRadius || 8, 0, 2 * Math.PI);
          ctx.stroke();
        }
      }
    }
  }
};
