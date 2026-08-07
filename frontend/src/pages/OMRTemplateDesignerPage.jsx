import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, Plus, Trash2, Save, X, Eye, EyeOff, Maximize, Move, HelpCircle, Code, AlignCenter, AlertTriangle, CheckCircle, ChevronDown, Trash, Copy } from 'lucide-react';
import { api, API_BASE } from '../api/api';
import SearchableDropdown from '../components/SearchableDropdown';
import { drawAnchorsOverlay, drawTimingMarksOverlay, drawRegNoOverlay, drawQPCodeOverlay, drawSheetNoOverlay, drawQuestionsOverlay } from '../components/canvasDrawers/DesignerDrawers';
import TemplatesList from '../components/templateDesigner/TemplatesList';
import AnchorsPanel from '../components/templateDesigner/AnchorsPanel';
import RegNoPanel from '../components/templateDesigner/RegNoPanel';
import QPCodePanel from '../components/templateDesigner/QPCodePanel';
import SheetNoPanel from '../components/templateDesigner/SheetNoPanel';
import QuestionsPanel from '../components/templateDesigner/QuestionsPanel';


const OMRTemplateDesignerPage = ({ onTemplateSaved }) => {

  const [templateName, setTemplateName] = useState('My OMR Template');
  const [imageSrc, setImageSrc] = useState(null);
  const [existingImagePath, setExistingImagePath] = useState('');
  const [imageDimensions, setImageDimensions] = useState({ width: 800, height: 1100 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [viewMode, setViewMode] = useState('list'); // 'list' | 'designer'
  const [allTemplates, setAllTemplates] = useState([]);

  const [anchors, setAnchors] = useState({
    type: '4_corners',
    topLeft: { x: 40, y: 40 },
    topRight: { x: 760, y: 40 },
    bottomLeft: { x: 40, y: 1060 },
    bottomRight: { x: 760, y: 1060 }
  });

  const [regNoBlocks, setRegNoBlocks] = useState([
    {
      id: 1,
      enabled: true,
      x: 100,
      y: 150,
      width: 250,
      height: 300,
      columns: 6, // 6 digits
      rows: 10,   // 0-9
      bubbleRadius: 8,
      sequence: '0-9',
      type: 'numeric',
      columnTypes: []
    }
  ]);
  const [activeRegBlockId, setActiveRegBlockId] = useState(1);

  const [qpCodeConfig, setQpCodeConfig] = useState({
    enabled: false,
    x: 400,
    y: 150,
    width: 150,
    height: 300,
    columns: 4, // 4 digits
    rows: 10,   // 0-9
    bubbleRadius: 8,
    sequence: '0-9'
  });

  const [sheetNoConfig, setSheetNoConfig] = useState({
    enabled: true,
    mode: 'barcode', // 'manual_entry' | 'barcode'
    omr_id: '',
    x: 450,
    y: 150,
    width: 250,
    height: 100,
    columns: 6,
    rows: 10,
    bubbleRadius: 8
  });

  const [timingMarksConfig, setTimingMarksConfig] = useState({
    enabled: false,
    left: { x: 20, y: 100, width: 20, height: 900, count: 45 },
    right: { x: 760, y: 100, width: 20, height: 900, count: 45 }
  });

  const [questionBlocks, setQuestionBlocks] = useState([
    {
      id: 1,
      name: 'Questions 1-30',
      x: 100,
      y: 520,
      width: 600,
      height: 480,
      startQ: 1,
      qCount: 30,
      columnsCount: 3, // 3 columns of questions (10 questions per column)
      options: ['A', 'B', 'C', 'D'],
      bubbleRadius: 8
    }
  ]);

  const [activeTab, setActiveTab] = useState('anchors'); // anchors | regno | sheetno | questions
  const [activeQBlockId, setActiveQBlockId] = useState(1);

  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const [imageObj, setImageObj] = useState(null);

  // Hierarchy States
  const [parents, setParents] = useState([]);
  const [selectedParentId, setSelectedParentId] = useState('');
  const [qpcodes, setQpcodes] = useState([]);
  const [selectedQpCodeId, setSelectedQpCodeId] = useState('');

  // States for loading and editing existing templates
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [templateQpCode, setTemplateQpCode] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Bulk generator states
  const [genTotalQ, setGenTotalQ] = useState(100);
  const [genRowsPerBlock, setGenRowsPerBlock] = useState(20);
  const [genColsPerBlock, setGenColsPerBlock] = useState(1);
  const [genOptions, setGenOptions] = useState('A,B,C,D');
  const [genStartQ, setGenStartQ] = useState(1);

  const fetchTemplates = async () => {
    try {
      const res = await api.getTemplates();
      if (res.success) {
        setParents(res.parents || []);
        setAllTemplates(res.templates || []);
      }
    } catch (err) {
      console.error('Failed to load templates', err);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchQpCodes = async (parentId) => {
    try {
      const res = await api.getTemplates(null, parentId);
      if (res.success) {
        setQpcodes(res.qpcodes || []);
      }
    } catch (err) {
      console.error('Failed to load qpcodes', err);
    }
  };

  useEffect(() => {
    if (selectedParentId) {
      fetchQpCodes(selectedParentId);
    } else {
      setQpcodes([]);
      setSelectedQpCodeId('');
    }
  }, [selectedParentId]);

  const loadImageFromUrl = (url) => {
    const img = new Image();
    img.onload = () => {
      setImageObj(img);
      setImageSrc(url);
    };
    img.src = url;
  };

  const handleSelectTemplate = async (templateId, isCopy = false) => {
    setSelectedQpCodeId(templateId || '');
    if (!templateId) {
      // Clear/Reset to default state to start a new template design
      setEditingTemplateId(null);
      setTemplateQpCode('');
      setImageSrc(null);
      setImageObj(null);
      setExistingImagePath('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setAnchors({
        type: '4_corners',
        topLeft: { x: 40, y: 40 },
        topRight: { x: 760, y: 40 },
        bottomLeft: { x: 40, y: 1060 },
        bottomRight: { x: 760, y: 1060 }
      });
      setRegNoBlocks([
        {
          id: 1,
          enabled: true,
          x: 100,
          y: 150,
          width: 250,
          height: 300,
          columns: 6,
          rows: 10,
          bubbleRadius: 8,
          sequence: '0-9',
          type: 'numeric',
          columnTypes: []
        }
      ]);
      setActiveRegBlockId(1);
      setQpCodeConfig({
        enabled: false,
        x: 400,
        y: 150,
        width: 150,
        height: 300,
        columns: 4,
        rows: 10,
        bubbleRadius: 8,
        sequence: '0-9'
      });
      setSheetNoConfig({
        enabled: true,
        mode: 'barcode',
        omr_id: '',
        x: 450,
        y: 150,
        width: 250,
        height: 100,
        columns: 6,
        rows: 10,
        bubbleRadius: 8
      });
      setTimingMarksConfig({
        enabled: false,
        left: { x: 20, y: 100, width: 20, height: 900, count: 45 },
        right: { x: 760, y: 100, width: 20, height: 900, count: 45 }
      });
      setQuestionBlocks([
        {
          id: 1,
          name: 'Questions 1-30',
          x: 100,
          y: 520,
          width: 600,
          height: 480,
          startQ: 1,
          qCount: 30,
          columnsCount: 3,
          options: ['A', 'B', 'C', 'D'],
          bubbleRadius: 8
        }
      ]);
      setActiveTab('anchors');
      setActiveQBlockId(1);
      setError('');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await api.getTemplates(templateId);
      if (res.success && res.template) {
        const t = res.template;
        setEditingTemplateId(isCopy ? null : t.id);
        setTemplateName(isCopy ? `${t.name} - Copy` : t.name);
        setTemplateQpCode(isCopy ? '' : (t.qpcode || ''));
        setExistingImagePath(t.blank_image_path || '');
        setImageDimensions({ width: parseInt(t.width) || 800, height: parseInt(t.height) || 1100 });

        const loadedAnchors = typeof t.anchors_json === 'string' ? JSON.parse(t.anchors_json) : t.anchors_json;
        
        const defaultTimingMarks = { enabled: false, left: { x: 20, y: 100, width: 20, height: 900, count: 45 }, right: { x: 760, y: 100, width: 20, height: 900, count: 45 } };
        if (loadedAnchors && loadedAnchors.timingMarks) {
          setTimingMarksConfig(loadedAnchors.timingMarks);
          delete loadedAnchors.timingMarks;
        } else {
          setTimingMarksConfig(defaultTimingMarks);
        }
        setAnchors({ type: '4_corners', ...loadedAnchors });

        const defaultRegNo = { enabled: false, x: 100, y: 150, width: 250, height: 300, columns: 6, rows: 10, bubbleRadius: 8, sequence: '0-9', type: 'numeric', columnTypes: [] };
        const parsedRegNo = (t.regno_config && t.regno_config !== 'null') ? (typeof t.regno_config === 'string' ? JSON.parse(t.regno_config) : t.regno_config) : null;
        if (parsedRegNo && Array.isArray(parsedRegNo)) {
          setRegNoBlocks(parsedRegNo);
          setActiveRegBlockId(parsedRegNo[0]?.id || 1);
        } else {
          setRegNoBlocks([{ ...defaultRegNo, ...(parsedRegNo || {}), id: 1 }]);
          setActiveRegBlockId(1);
        }

        const defaultQpCode = { enabled: false, x: 400, y: 150, width: 150, height: 300, columns: 4, rows: 10, bubbleRadius: 8, sequence: '0-9' };
        const parsedQpCode = (t.qpcode_config && t.qpcode_config !== 'null') ? (typeof t.qpcode_config === 'string' ? JSON.parse(t.qpcode_config) : t.qpcode_config) : null;
        setQpCodeConfig({ ...defaultQpCode, ...(parsedQpCode || {}) });

        const defaultSheetNo = { enabled: false, mode: 'barcode', omr_id: '', x: 450, y: 150, width: 250, height: 100, columns: 6, rows: 10, bubbleRadius: 8 };
        const parsedSheetNo = (t.sheetno_config && t.sheetno_config !== 'null') ? (typeof t.sheetno_config === 'string' ? JSON.parse(t.sheetno_config) : t.sheetno_config) : null;
        setSheetNoConfig({ ...defaultSheetNo, ...(parsedSheetNo || {}) });

        const loadedQuestions = typeof t.questions_config === 'string' ? JSON.parse(t.questions_config) : t.questions_config;
        setQuestionBlocks(loadedQuestions);
        if (loadedQuestions.length > 0) {
          setActiveQBlockId(loadedQuestions[0].id);
        }

        // Load image from URL
        const imageUrl = `${API_BASE}/${t.blank_image_path}`;
        loadImageFromUrl(imageUrl);
      } else {
        setError(res.message || 'Failed to load template details.');
      }
    } catch (err) {
      setError('Error loading template details.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReplaceImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleGenerateBlocks = () => {
    const totalQVal = parseInt(genTotalQ) || 0;
    const rowsPerBlockVal = parseInt(genRowsPerBlock) || 0;
    const colsPerBlockVal = parseInt(genColsPerBlock) || 1;
    const startQVal = parseInt(genStartQ) || 1;

    if (totalQVal <= 0 || rowsPerBlockVal <= 0) {
      alert('Total Questions and Rows per Block must be greater than 0.');
      return;
    }

    const optionsArr = genOptions.split(',').map(o => o.trim()).filter(Boolean);
    if (optionsArr.length === 0) {
      alert('Please specify at least one option (e.g. A,B,C,D).');
      return;
    }

    const qPerBlock = rowsPerBlockVal * colsPerBlockVal;
    const numBlocks = Math.ceil(totalQVal / qPerBlock);

    const blocks = [];
    for (let i = 0; i < numBlocks; i++) {
      const blockStartQ = startQVal + i * qPerBlock;
      const blockQCount = Math.min(qPerBlock, totalQVal - (i * qPerBlock));

      blocks.push({
        id: i + 1,
        name: `Questions ${blockStartQ}-${blockStartQ + blockQCount - 1}`,
        x: 100 + (i % 2) * 150,
        y: 450 + Math.floor(i / 2) * 120,
        width: Math.min(600, colsPerBlockVal * 150 + 50),
        height: Math.min(600, rowsPerBlockVal * 20 + 20),
        startQ: blockStartQ,
        qCount: blockQCount,
        columnsCount: colsPerBlockVal,
        options: optionsArr,
        bubbleRadius: 8
      });
    }

    setQuestionBlocks(blocks);
    if (blocks.length > 0) {
      setActiveQBlockId(blocks[0].id);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const processImageFile = (file) => {
    if (!file) return;

    if (fileInputRef.current) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInputRef.current.files = dataTransfer.files;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setImageObj(img);
        // Normalize design coordinates to 800x1100
        setImageDimensions({ width: 800, height: 1100 });
        setImageSrc(event.target.result);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Load image when uploaded
  const handleImageUpload = (e) => {
    const file = e.target?.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  // Helper to calculate coordinates inside the Student Reg No grid
  const getRegNoBubbles = (config) => {
    if (!config.enabled) return [];
    const bubbles = [];
    const colSpacing = config.width / (config.columns - 1 || 1);
    const rowSpacing = config.height / (config.rows - 1 || 1);

    for (let col = 0; col < config.columns; col++) {
      const x = config.x + col * colSpacing;
      const colType = (config.type === 'alphanumeric' && config.columnTypes && config.columnTypes[col]) ? config.columnTypes[col] : 'numeric';
      const bubblesInCol = colType === 'alpha' ? 26 : (colType === 'numeric' && config.type === 'alphanumeric' ? Math.min(10, config.rows) : config.rows);

      for (let row = 0; row < bubblesInCol; row++) {
        const y = config.y + row * rowSpacing;
        let label = '';
        if (colType === 'alpha') {
          label = String.fromCharCode(65 + row);
        } else {
          if (config.sequence === '1-0' && bubblesInCol === 10) {
            label = row === 9 ? '0' : (row + 1).toString();
          } else {
            label = bubblesInCol === 10 ? row.toString() : (config.rows === 9 ? (row + 1).toString() : row.toString());
          }
        }
        bubbles.push({
          label: label,
          colIndex: col,
          x: Math.round(x),
          y: Math.round(y),
          r: config.bubbleRadius
        });
      }
    }
    return bubbles;
  };

  // Helper to calculate coordinates inside a question block
  const getQuestionBlockBubbles = (block) => {
    const bubbles = [];

    const qCountVal = parseInt(block.qCount, 10) || 1;
    const columnsCountVal = parseInt(block.columnsCount, 10) || 1;
    const startQVal = parseInt(block.startQ, 10) || 1;
    const blockX = parseFloat(block.x) || 0;
    const blockY = parseFloat(block.y) || 0;
    const blockWidth = parseFloat(block.width) || 0;
    const blockHeight = parseFloat(block.height) || 0;
    const bubbleRadiusVal = parseFloat(block.bubbleRadius) || 8;

    const qsPerCol = Math.ceil(qCountVal / columnsCountVal);
    const colSpacing = blockWidth / (columnsCountVal || 1);

    for (let col = 0; col < columnsCountVal; col++) {
      const colStartX = blockX + col * colSpacing;
      const colWidth = colSpacing * 0.9; // leave some gap
      const rowSpacing = blockHeight / (qsPerCol - 1 || 1);

      for (let row = 0; row < qsPerCol; row++) {
        const qIndex = col * qsPerCol + row;
        if (qIndex >= qCountVal) break;

        const qNumber = startQVal + qIndex;
        const qY = blockY + row * rowSpacing;

        // Option horizontal layout inside question area
        // Question number labels are on the left, options are spaced horizontally
        const textOffset = 25; // Space for question label e.g. "1."
        const optionsAreaWidth = colWidth - textOffset;
        const optSpacing = optionsAreaWidth / (block.options.length - 1 || 1);

        block.options.forEach((opt, optIdx) => {
          const optX = colStartX + textOffset + optIdx * optSpacing;
          bubbles.push({
            qNum: qNumber,
            label: opt,
            x: Math.round(optX),
            y: Math.round(qY),
            r: bubbleRadiusVal
          });
        });
      }
    }
    return bubbles;
  };

  // Draw resize handle indicators on active bounding boxes
  const drawResizeHandles = (ctx, target, color) => {
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

  // Draw the image and overlays on the canvas
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !imageObj) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imageObj, 0, 0, canvas.width, canvas.height);

    drawAnchorsOverlay(ctx, anchors, activeTab);
    drawTimingMarksOverlay(ctx, anchors, timingMarksConfig, activeTab);
    drawRegNoOverlay(ctx, regNoBlocks, activeRegBlockId, activeTab, getRegNoBubbles);
    drawQPCodeOverlay(ctx, qpCodeConfig, activeTab, getRegNoBubbles);
    drawSheetNoOverlay(ctx, sheetNoConfig, activeTab);
    drawQuestionsOverlay(ctx, questionBlocks, activeQBlockId, activeTab, getQuestionBlockBubbles);
  };

  useEffect(() => {
    drawCanvas();
  }, [imageObj, anchors, regNoBlocks, qpCodeConfig, sheetNoConfig, timingMarksConfig, questionBlocks, activeTab, activeQBlockId]);

  // Update cursor dynamically based on hover coordinates
  const handleCanvasMouseMove = (e) => {
    if (activeTab === 'anchors' && (!anchors.type || anchors.type === '4_corners')) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    let target = null;
    if (activeTab === 'regno' && activeRegBlock && activeRegBlock.enabled) target = activeRegBlock;
    else if (activeTab === 'qpcode' && qpCodeConfig.enabled) target = qpCodeConfig;
    else if (activeTab === 'sheetno' && sheetNoConfig.enabled && sheetNoConfig.mode === 'barcode') target = sheetNoConfig;
    else if (activeTab === 'questions' && activeQBlock) target = activeQBlock;
    else if (activeTab === 'anchors' && anchors.type === 'timing_marks') {
      const isNearTM = (tm) => x >= tm.x - 15 && x <= tm.x + tm.width + 15 && y >= tm.y - 15 && y <= tm.y + tm.height + 15;
      if (isNearTM(timingMarksConfig.left)) target = timingMarksConfig.left;
      else if (isNearTM(timingMarksConfig.right)) target = timingMarksConfig.right;
    }

    if (!target) {
      canvas.style.cursor = 'default';
      return;
    }

    const handleSize = 15;
    const isNear = (x1, y1, x2, y2) => Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2) < handleSize;

    const overTL = isNear(x, y, target.x, target.y);
    const overTR = isNear(x, y, target.x + target.width, target.y);
    const overBL = isNear(x, y, target.x, target.y + target.height);
    const overBR = isNear(x, y, target.x + target.width, target.y + target.height);

    const overTop = isNear(x, y, target.x + target.width / 2, target.y);
    const overBottom = isNear(x, y, target.x + target.width / 2, target.y + target.height);
    const overLeft = isNear(x, y, target.x, target.y + target.height / 2);
    const overRight = isNear(x, y, target.x + target.width, target.y + target.height / 2);

    if (overTL || overBR) {
      canvas.style.cursor = 'nwse-resize';
    } else if (overTR || overBL) {
      canvas.style.cursor = 'nesw-resize';
    } else if (overTop || overBottom) {
      canvas.style.cursor = 'ns-resize';
    } else if (overLeft || overRight) {
      canvas.style.cursor = 'ew-resize';
    } else if (x >= target.x && x <= target.x + target.width && y >= target.y && y <= target.y + target.height) {
      canvas.style.cursor = 'move';
    } else {
      canvas.style.cursor = 'default';
    }
  };

  // Handle Dragging / Resizing of anchors or bounding boxes on the canvas
  const handleCanvasMouseDown = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const clickY = ((e.clientY - rect.top) / rect.height) * canvas.height;

    if (activeTab === 'anchors' && (!anchors.type || anchors.type === '4_corners')) {
      // Check which anchor is clicked
      const clickedAnchor = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'].find(key => {
        const pt = anchors[key];
        if(!pt) return false;
        const dist = Math.sqrt((pt.x - clickX) ** 2 + (pt.y - clickY) ** 2);
        return dist < 20; // 20px hit area
      });

      if (clickedAnchor) {
        const handleMouseMove = (moveEvent) => {
          const moveRect = canvas.getBoundingClientRect();
          const moveX = Math.round(Math.max(0, Math.min(canvas.width, ((moveEvent.clientX - moveRect.left) / moveRect.width) * canvas.width)));
          const moveY = Math.round(Math.max(0, Math.min(canvas.height, ((moveEvent.clientY - moveRect.top) / moveRect.height) * canvas.height)));

          setAnchors(prev => ({
            ...prev,
            [clickedAnchor]: { x: moveX, y: moveY }
          }));
        };

        const handleMouseUp = () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
      }
      return;
    }

    // Drag / Resize Bounding Box
    let target = null;
    let setTarget = null;

    if (activeTab === 'regno' && activeRegBlock && activeRegBlock.enabled) {
      target = activeRegBlock;
      setTarget = (newVal) => {
        if (typeof newVal === 'function') {
          setRegNoBlocks(prev => prev.map(b => Number(b.id) === Number(activeRegBlockId) ? newVal(b) : b));
        } else {
          setRegNoBlocks(prev => prev.map(b => Number(b.id) === Number(activeRegBlockId) ? newVal : b));
        }
      };
    } else if (activeTab === 'qpcode' && qpCodeConfig.enabled) {
      target = qpCodeConfig;
      setTarget = setQpCodeConfig;
    } else if (activeTab === 'sheetno' && sheetNoConfig.enabled && sheetNoConfig.mode === 'barcode') {
      target = sheetNoConfig;
      setTarget = setSheetNoConfig;
    } else if (activeTab === 'questions' && activeQBlock) {
      target = activeQBlock;
      setTarget = (newVal) => {
        if (typeof newVal === 'function') {
          setQuestionBlocks(prev => prev.map(b => Number(b.id) === Number(activeQBlockId) ? newVal(b) : b));
        } else {
          setQuestionBlocks(prev => prev.map(b => Number(b.id) === Number(activeQBlockId) ? newVal : b));
        }
      };
    } else if (activeTab === 'anchors' && anchors.type === 'timing_marks') {
      const isNearTM = (tm) => clickX >= tm.x - 15 && clickX <= tm.x + tm.width + 15 && clickY >= tm.y - 15 && clickY <= tm.y + tm.height + 15;
      if (isNearTM(timingMarksConfig.left)) {
        target = timingMarksConfig.left;
        setTarget = (newVal) => {
          if (typeof newVal === 'function') setTimingMarksConfig(prev => ({ ...prev, left: newVal(prev.left) }));
          else setTimingMarksConfig(prev => ({ ...prev, left: newVal }));
        };
      } else if (isNearTM(timingMarksConfig.right)) {
        target = timingMarksConfig.right;
        setTarget = (newVal) => {
          if (typeof newVal === 'function') setTimingMarksConfig(prev => ({ ...prev, right: newVal(prev.right) }));
          else setTimingMarksConfig(prev => ({ ...prev, right: newVal }));
        };
      }
    }

    if (!target || !setTarget) return;

    const handleSize = 15;
    const isNear = (x1, y1, x2, y2) => Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2) < handleSize;

    let activeCorner = null;
    if (isNear(clickX, clickY, target.x, target.y)) activeCorner = 'topLeft';
    else if (isNear(clickX, clickY, target.x + target.width, target.y)) activeCorner = 'topRight';
    else if (isNear(clickX, clickY, target.x, target.y + target.height)) activeCorner = 'bottomLeft';
    else if (isNear(clickX, clickY, target.x + target.width, target.y + target.height)) activeCorner = 'bottomRight';
    else if (isNear(clickX, clickY, target.x + target.width / 2, target.y)) activeCorner = 'top';
    else if (isNear(clickX, clickY, target.x + target.width / 2, target.y + target.height)) activeCorner = 'bottom';
    else if (isNear(clickX, clickY, target.x, target.y + target.height / 2)) activeCorner = 'left';
    else if (isNear(clickX, clickY, target.x + target.width, target.y + target.height / 2)) activeCorner = 'right';

    const isInside = clickX >= target.x && clickX <= target.x + target.width &&
      clickY >= target.y && clickY <= target.y + target.height;

    if (activeCorner) {
      const startX = target.x;
      const startY = target.y;
      const startW = target.width;
      const startH = target.height;
      const rightX = startX + startW;
      const bottomY = startY + startH;

      const handleMouseMove = (moveEvent) => {
        const moveRect = canvas.getBoundingClientRect();
        const curX = Math.round(Math.max(0, Math.min(canvas.width, ((moveEvent.clientX - moveRect.left) / moveRect.width) * canvas.width)));
        const curY = Math.round(Math.max(0, Math.min(canvas.height, ((moveEvent.clientY - moveRect.top) / moveRect.height) * canvas.height)));

        let newX = startX;
        let newY = startY;
        let newW = startW;
        let newH = startH;

        if (activeCorner === 'topLeft') {
          newX = Math.min(rightX - 30, curX);
          newY = Math.min(bottomY - 30, curY);
          newW = rightX - newX;
          newH = bottomY - newY;
        } else if (activeCorner === 'topRight') {
          newY = Math.min(bottomY - 30, curY);
          newW = Math.max(30, curX - startX);
          newH = bottomY - newY;
        } else if (activeCorner === 'bottomLeft') {
          newX = Math.min(rightX - 30, curX);
          newW = rightX - newX;
          newH = Math.max(30, curY - startY);
        } else if (activeCorner === 'bottomRight') {
          newW = Math.max(30, curX - startX);
          newH = Math.max(30, curY - startY);
        } else if (activeCorner === 'top') {
          newY = Math.min(bottomY - 30, curY);
          newH = bottomY - newY;
        } else if (activeCorner === 'bottom') {
          newH = Math.max(30, curY - startY);
        } else if (activeCorner === 'left') {
          newX = Math.min(rightX - 30, curX);
          newW = rightX - newX;
        } else if (activeCorner === 'right') {
          newW = Math.max(30, curX - startX);
        }

        setTarget(prev => ({
          ...prev,
          x: newX,
          y: newY,
          width: newW,
          height: newH
        }));
      };

      const handleMouseUp = () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

    } else if (isInside) {
      const startX = target.x;
      const startY = target.y;
      const startClickX = clickX;
      const startClickY = clickY;

      const handleMouseMove = (moveEvent) => {
        const moveRect = canvas.getBoundingClientRect();
        const curX = ((moveEvent.clientX - moveRect.left) / moveRect.width) * canvas.width;
        const curY = ((moveEvent.clientY - moveRect.top) / moveRect.height) * canvas.height;

        const deltaX = curX - startClickX;
        const deltaY = curY - startClickY;

        setTarget(prev => ({
          ...prev,
          x: Math.max(0, Math.min(canvas.width - prev.width, Math.round(startX + deltaX))),
          y: Math.max(0, Math.min(canvas.height - prev.height, Math.round(startY + deltaY)))
        }));
      };

      const handleMouseUp = () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
  };

  // Add a new question block
  const handleAddQuestionBlock = () => {
    const nextId = questionBlocks.length > 0 ? Math.max(...questionBlocks.map(b => b.id)) + 1 : 1;
    const lastBlock = questionBlocks[questionBlocks.length - 1];
    const startQ = lastBlock ? parseInt(lastBlock.startQ, 10) + parseInt(lastBlock.qCount, 10) : 1;

    const newBlock = {
      id: nextId,
      name: `Questions ${startQ}-${startQ + 29}`,
      x: 100,
      y: lastBlock ? Math.min(950, lastBlock.y + 100) : 500,
      width: 600,
      height: 200,
      startQ: startQ,
      qCount: 30,
      columnsCount: 3,
      options: ['A', 'B', 'C', 'D'],
      bubbleRadius: 8
    };

    setQuestionBlocks([...questionBlocks, newBlock]);
    setActiveQBlockId(nextId);
  };

  const handleCopyQuestionBlock = () => {
    if (!activeQBlock) return;

    const nextId = questionBlocks.length > 0 ? Math.max(...questionBlocks.map(b => Number(b.id))) + 1 : 1;

    let nextStartQ = 1;
    if (questionBlocks.length > 0) {
      const highestQBlock = questionBlocks.reduce((max, b) => {
        const bEnd = parseInt(b.startQ) + parseInt(b.qCount);
        const maxEnd = parseInt(max.startQ) + parseInt(max.qCount);
        return bEnd > maxEnd ? b : max;
      }, questionBlocks[0]);
      nextStartQ = parseInt(highestQBlock.startQ) + parseInt(highestQBlock.qCount);
    }

    const newBlock = {
      ...activeQBlock,
      id: nextId,
      name: `Questions ${nextStartQ}-${nextStartQ + parseInt(activeQBlock.qCount) - 1}`,
      x: Math.min(canvasRef.current ? canvasRef.current.width - activeQBlock.width : 500, activeQBlock.x + 30),
      y: Math.min(canvasRef.current ? canvasRef.current.height - activeQBlock.height : 800, activeQBlock.y + 30),
      startQ: nextStartQ
    };

    setQuestionBlocks([...questionBlocks, newBlock]);
    setActiveQBlockId(nextId);
  };

  const handleRemoveQuestionBlock = (id) => {
    setQuestionBlocks(questionBlocks.filter(b => Number(b.id) !== Number(id)));
    if (Number(activeQBlockId) === Number(id) && questionBlocks.length > 1) {
      setActiveQBlockId(questionBlocks.filter(b => Number(b.id) !== Number(id))[0].id);
    }
  };

  const updateQBlockById = (id, field, val) => {
    setQuestionBlocks(questionBlocks.map(b => {
      if (Number(b.id) === Number(id)) {
        const updated = { ...b, [field]: val };
        if (field === 'startQ' || field === 'qCount') {
          const sQ = parseInt(field === 'startQ' ? val : b.startQ, 10) || 1;
          const qC = parseInt(field === 'qCount' ? val : b.qCount, 10) || 0;
          updated.name = `Questions ${sQ}-${sQ + qC - 1}`;
        }
        return updated;
      }
      return b;
    }));
  };

  // Save the template configuration to the PHP Backend
  const handleSaveTemplate = async () => {
    if (!imageSrc || !imageObj) {
      setError('Please upload a blank OMR sheet image first.');
      return;
    }

    if (!templateName.trim()) {
      setError('Please provide a template name.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Get the image file blob from the file input
      const file = fileInputRef.current?.files?.[0];
      if (!file && !editingTemplateId && !existingImagePath) {
        setError('Blank OMR sheet image file not found. Please upload it.');
        setLoading(false);
        return;
      }

      const formData = new FormData();
      if (editingTemplateId) {
        formData.append('id', editingTemplateId);
      }
      if (existingImagePath) {
        formData.append('existing_image_path', existingImagePath);
      }
      formData.append('name', templateName);
      formData.append('width', imageDimensions.width);
      formData.append('height', imageDimensions.height);
      if (file) {
        formData.append('blank_image', file);
      }

      const anchorsToSave = { ...anchors };
      if (anchors.type === 'timing_marks') {
        const lx = timingMarksConfig.left.x + timingMarksConfig.left.width / 2;
        const rx = timingMarksConfig.right.x + timingMarksConfig.right.width / 2;
        anchorsToSave.topLeft = { x: Math.round(lx), y: timingMarksConfig.left.y };
        anchorsToSave.bottomLeft = { x: Math.round(lx), y: timingMarksConfig.left.y + timingMarksConfig.left.height };
        anchorsToSave.topRight = { x: Math.round(rx), y: timingMarksConfig.right.y };
        anchorsToSave.bottomRight = { x: Math.round(rx), y: timingMarksConfig.right.y + timingMarksConfig.right.height };
      }

      formData.append('anchors_json', JSON.stringify({
        ...anchorsToSave,
        timingMarks: timingMarksConfig
      }));
      formData.append('regno_config', JSON.stringify(regNoBlocks));
      formData.append('qpcode_config', qpCodeConfig.enabled ? JSON.stringify(qpCodeConfig) : 'null');
      formData.append('sheetno_config', sheetNoConfig.enabled ? JSON.stringify(sheetNoConfig) : 'null');

      if (templateQpCode) {
        formData.append('qpcode', templateQpCode);
      }

      // Calculate bubble coordinates and bundle into questions config
      const questionsData = questionBlocks.map(block => ({
        ...block,
        bubbles: getQuestionBlockBubbles(block)
      }));
      formData.append('questions_config', JSON.stringify(questionsData));

      const resData = await api.saveTemplate(formData);

      if (resData.success) {
        alert(editingTemplateId ? 'Template updated successfully!' : 'Template saved successfully!');
        setEditingTemplateId(resData.template_id);

        await fetchTemplates();
        if (resData.parent_id) {
          setSelectedParentId(resData.parent_id);
          await fetchQpCodes(resData.parent_id);
          setSelectedQpCodeId(resData.template_id);
        }

        if (onTemplateSaved) {
          onTemplateSaved(resData.template_id);
        }
      } else {
        setError(resData.message || 'Failed to save template.');
      }
    } catch (err) {
      setError('Network error saving template. Check if PHP is running.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm("Are you sure you want to delete this template design? Associated answer keys will also be deleted. This cannot be undone.")) {
      return;
    }
    
    setLoading(true);
    try {
      const res = await api.deleteTemplate(templateId);
      if (res.success) {
        alert("Template deleted successfully");
        window.location.reload(); // Refresh the page completely
      } else {
        alert(res.message || "Failed to delete template");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting template");
    } finally {
      setLoading(false);
    }
  };

  const handleEditTemplate = async (template) => {
    // template is an object from allTemplates
    setSelectedParentId(template.template_id);
    await fetchQpCodes(template.template_id);
    setSelectedQpCodeId(template.id);
    await handleSelectTemplate(template.id);
    setViewMode('designer');
  };

  const handleCopyTemplate = async (template) => {
    await handleSelectTemplate(template.id, true);
    setViewMode('designer');
  };

  const activeQBlock = questionBlocks.find(b => Number(b.id) === Number(activeQBlockId));
  const activeRegBlock = regNoBlocks.find(b => Number(b.id) === Number(activeRegBlockId)) || regNoBlocks[0];

  if (viewMode === 'list') {
    return (
      <TemplatesList 
        loading={loading}
        allTemplates={allTemplates}
        parents={parents}
        handleSelectTemplate={handleSelectTemplate}
        handleEditTemplate={handleEditTemplate}
        handleCopyTemplate={handleCopyTemplate}
        handleDeleteTemplate={handleDeleteTemplate}
        setViewMode={setViewMode}
      />
    );
  }

  return (
    <div className="glass-card" style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '2rem', minHeight: '80vh' }}>

      {/* File input kept mounted to prevent ref loss on conditional rendering */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept="image/*"
        onChange={handleImageUpload}
      />

      {/* Design Side Panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', borderRight: '1px solid var(--border-color)', paddingRight: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.5rem' }}>
          <button className="btn btn-secondary" style={{ padding: '0.5rem', marginTop: '0.2rem' }} title="Back to List" onClick={() => { fetchTemplates(); setViewMode('list'); }}>
            &larr;
          </button>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.25rem' }}>Template Designer</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Map the structure of your blank OMR sheet.</p>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Template Group</label>
          <SearchableDropdown
            options={[{ label: "-- Create New Template --", value: "" }, ...parents.map(p => ({ label: p.name, value: p.id.toString() }))]}
            value={selectedParentId || ''}
            onChange={(val) => {
              setSelectedParentId(val);
              setEditingTemplateId(null);
              setSelectedQpCodeId('');
              if (val) {
                const p = parents.find(x => x.id.toString() === val);
                if (p) setTemplateName(p.name);
              } else {
                setTemplateName('');
              }
            }}
            placeholder="-- Create New Template --"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Template Name</label>
          <input
            type="text"
            className="form-input"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="e.g. JSS 1st Sem OMR"
          />
        </div>

        {/* QP Code Dropdown (Only show if a parent is selected) */}
        {selectedParentId && (
          <div className="form-group">
            <label className="form-label">QP Code (Design)</label>
            <SearchableDropdown
              options={[{ label: "-- Create New QPCode Design --", value: "" }, ...qpcodes.map(q => ({ label: q.qpcode || `Design #${q.id}`, value: q.id.toString() }))]}
              value={selectedQpCodeId || ''}
              onChange={(val) => {
                setSelectedQpCodeId(val);
                handleSelectTemplate(val ? parseInt(val) : null);
              }}
              placeholder="-- Create New QPCode Design --"
            />
          </div>
        )}

        <div className="form-group">
          <label className="form-label">QP Code Value</label>
          <input
            type="text"
            className="form-input"
            value={templateQpCode}
            onChange={(e) => setTemplateQpCode(e.target.value)}
            placeholder="e.g. 001"
          />
        </div>

        {!imageSrc ? (
          <div
            onClick={() => fileInputRef.current.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              border: isDragging ? '2px dashed var(--accent-primary)' : '2px dashed var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              padding: '3rem 1.5rem',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'var(--transition)',
              background: isDragging ? 'rgba(99, 102, 241, 0.05)' : 'transparent'
            }}
            onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
            onMouseOut={(e) => e.currentTarget.style.borderColor = isDragging ? 'var(--accent-primary)' : 'var(--border-color)'}
          >
            <Upload size={32} style={{ color: isDragging ? 'var(--accent-primary)' : 'var(--text-secondary)', marginBottom: '0.75rem' }} />
            <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>Upload Blank OMR Sheet</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Supports PNG, JPG, JPEG</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>

            {/* Drag & Drop Image Preview Block */}
            <div
              onClick={() => fileInputRef.current.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{
                position: 'relative',
                border: isDragging ? '2px dashed var(--accent-primary)' : '2px dashed var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                height: '100px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                overflow: 'hidden',
                transition: 'var(--transition)',
                background: `linear-gradient(rgba(0,0,0,${isDragging ? 0.4 : 0.65}), rgba(0,0,0,${isDragging ? 0.4 : 0.65})), url(${imageSrc})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
              onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
              onMouseOut={(e) => e.currentTarget.style.borderColor = isDragging ? 'var(--accent-primary)' : 'var(--border-color)'}
            >
              <div style={{ textAlign: 'center', color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                <Upload size={20} style={{ marginBottom: '0.25rem', color: isDragging ? 'var(--accent-primary)' : '#fff' }} />
                <p style={{ fontSize: '0.8rem', fontWeight: 600 }}>Drag & Drop or Click to Replace Image</p>
              </div>
            </div>

            {/* Tab Selectors */}
            <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-primary)', padding: '3px', borderRadius: '6px' }}>
              <button
                onClick={() => setActiveTab('anchors')}
                style={{ flex: 1, padding: '6px', fontSize: '0.8rem', background: activeTab === 'anchors' ? 'var(--bg-tertiary)' : 'transparent', color: activeTab === 'anchors' ? 'var(--text-primary)' : 'var(--text-secondary)', border: 0, borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
              >
                Anchors
              </button>
              <button
                onClick={() => setActiveTab('regno')}
                style={{ flex: 1, padding: '6px', fontSize: '0.8rem', background: activeTab === 'regno' ? 'var(--bg-tertiary)' : 'transparent', color: activeTab === 'regno' ? 'var(--text-primary)' : 'var(--text-secondary)', border: 0, borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
              >
                Reg No
              </button>
              <button
                onClick={() => setActiveTab('qpcode')}
                style={{ flex: 1, padding: '6px', fontSize: '0.8rem', background: activeTab === 'qpcode' ? 'var(--bg-tertiary)' : 'transparent', color: activeTab === 'qpcode' ? 'var(--text-primary)' : 'var(--text-secondary)', border: 0, borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
              >
                QP Code
              </button>
              <button
                onClick={() => setActiveTab('sheetno')}
                style={{ flex: 1, padding: '6px', fontSize: '0.8rem', background: activeTab === 'sheetno' ? 'var(--bg-tertiary)' : 'transparent', color: activeTab === 'sheetno' ? 'var(--text-primary)' : 'var(--text-secondary)', border: 0, borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
              >
                Sheet No
              </button>
              <button
                onClick={() => setActiveTab('questions')}
                style={{ flex: 1, padding: '6px', fontSize: '0.8rem', background: activeTab === 'questions' ? 'var(--bg-tertiary)' : 'transparent', color: activeTab === 'questions' ? 'var(--text-primary)' : 'var(--text-secondary)', border: 0, borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
              >
                Q-Grid
              </button>
              <button
                onClick={() => setActiveTab('all')}
                style={{ padding: '6px', fontSize: '0.8rem', background: activeTab === 'all' ? 'var(--bg-tertiary)' : 'transparent', color: activeTab === 'all' ? 'var(--text-primary)' : 'var(--text-secondary)', border: 0, borderRadius: '4px', cursor: 'pointer' }}
              >
                <Eye size={14} />
              </button>
            </div>

            {/* TAB CONTENTS */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', maxHeight: '420px' }}>
              {activeTab === 'anchors' && <AnchorsPanel anchors={anchors} setAnchors={setAnchors} timingMarksConfig={timingMarksConfig} setTimingMarksConfig={setTimingMarksConfig} />}
              {activeTab === 'regno' && <RegNoPanel regNoBlocks={regNoBlocks} setRegNoBlocks={setRegNoBlocks} activeRegBlockId={activeRegBlockId} setActiveRegBlockId={setActiveRegBlockId} activeRegBlock={activeRegBlock} />}
              {activeTab === 'qpcode' && <QPCodePanel qpCodeConfig={qpCodeConfig} setQpCodeConfig={setQpCodeConfig} />}
              {activeTab === 'sheetno' && <SheetNoPanel sheetNoConfig={sheetNoConfig} setSheetNoConfig={setSheetNoConfig} />}
              {activeTab === 'questions' && <QuestionsPanel questionBlocks={questionBlocks} setQuestionBlocks={setQuestionBlocks} activeQBlockId={activeQBlockId} setActiveQBlockId={setActiveQBlockId} activeQBlock={activeQBlock} canvasRef={canvasRef} />}
            </div>

            {error && <p style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{error}</p>}

            <button
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 'auto' }}
              onClick={handleSaveTemplate}
              disabled={loading}
            >
              <Save size={18} /> {loading ? 'Saving Template...' : 'Save Template'}
            </button>
          </div>
        )}
      </div>

      {/* Canvas View Side */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#090b11', borderRadius: 'var(--radius-md)', padding: '1rem', overflow: 'auto', position: 'relative' }}>
        {imageSrc ? (
          <div style={{ position: 'relative', width: '800px', height: '1100px', transform: 'scale(0.65)', transformOrigin: 'center center', margin: '-190px -140px' }}>
            <canvas
              ref={canvasRef}
              width={800}
              height={1100}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              style={{
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                background: '#000',
                boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
              }}
            />
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            <Upload size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <p>Upload a blank OMR sheet to display the designer canvas.</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default OMRTemplateDesignerPage;
