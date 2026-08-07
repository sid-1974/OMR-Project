export const drawQuestionBubbles = (ctx, qConfig) => {
  if (qConfig) {
    if (typeof qConfig === 'string') qConfig = JSON.parse(qConfig);
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1.5;
    qConfig.forEach(block => {
      if (block.bubbles) {
        block.bubbles.forEach(b => {
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r || 8, 0, 2 * Math.PI);
          ctx.stroke();
        });
      }
    });
  }
};
