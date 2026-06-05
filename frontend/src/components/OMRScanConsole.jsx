import React, { useState, useEffect, useRef } from 'react';
import { Play, CheckSquare, FileText, ChevronRight, User, AlertCircle, CheckCircle, Edit, Trash } from 'lucide-react';
import OMRImageAdjuster from './OMRImageAdjuster';
import { scanQuestionRow, scanRegistrationGrid, detectAnchors, warpPerspective } from '../utils/omrScanner';
import { api } from '../api/api';

const OMRScanConsole = ({ onEvaluationComplete }) => {

  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  
  const [files, setFiles] = useState([]);
  const [processingQueue, setProcessingQueue] = useState([]);
  const [processingIndex, setProcessingIndex] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanMode, setScanMode] = useState(null); // 'all' | 'manual'
  
  // Active Manual Alignment state
  const [aligningIndex, setAligningIndex] = useState(null);
  // Active Manual Review/Approval state
  const [reviewingIndex, setReviewingIndex] = useState(null);
  const [reviewData, setReviewData] = useState(null);

  const rawCanvasRef = useRef(document.createElement('canvas'));
  const warpedCanvasRef = useRef(document.createElement('canvas'));
  const reviewCanvasRef = useRef(null);

  // Fetch OMR templates on load
  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const data = await api.getTemplates();
      if (data.success) {
        setTemplates(data.templates);
        if (data.templates.length > 0) {
          setSelectedTemplateId(data.templates[0].id.toString());
        }
      }
    } catch (err) {
      console.error("Failed to load templates", err);
    }
  };

  // Load template details when selected
  useEffect(() => {
    if (!selectedTemplateId) return;
    fetchTemplateDetails(selectedTemplateId);
  }, [selectedTemplateId]);

  const fetchTemplateDetails = async (id) => {
    try {
      const data = await api.getTemplates(id);
      if (data.success) {
        setSelectedTemplate(data.template);
      }
    } catch (err) {
      console.error("Failed to fetch template details", err);
    }
  };

  // Handle file uploads
  const handleFileChange = (e) => {
    const uploadedFiles = Array.from(e.target.files);
    const newQueue = uploadedFiles.map(file => ({
      file: file,
      name: file.name,
      status: 'pending', // pending | aligning | scanning | review | completed | failed
      error: '',
      results: null,
      alignedDataUrl: null,
      alignedBlob: null,
      scannedSheetId: null,
      studentRegno: '',
      sheetNumber: ''
    }));
    setFiles(prev => [...prev, ...newQueue]);
  };

  const removeFile = (idx) => {
    setFiles(files.filter((_, i) => i !== idx));
  };

  // Pre-upload raw scan to PHP backend
  const uploadRawScan = async (fileItem) => {
    const formData = new FormData();
    formData.append('template_id', selectedTemplateId);
    formData.append('scan_image', fileItem.file);

    const data = await api.uploadScan(formData);
    if (!data.success) {
      throw new Error(data.message || "Failed to upload scan to backend.");
    }
    return data; // returns scanned_sheet_id, raw_image_path
  };

  // Scan Bubbles from the Aligned Canvas
  const processAlignedOMR = (canvas, templateDetail) => {
    const ctx = canvas.getContext('2d');
    const globalImgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Parse Configurations
    let qConfig = templateDetail.questions_config;
    if (typeof qConfig === 'string') qConfig = JSON.parse(qConfig);

    let regConfig = templateDetail.regno_config;
    if (typeof regConfig === 'string') regConfig = JSON.parse(regConfig);

    let sheetConfig = templateDetail.sheetno_config;
    if (typeof sheetConfig === 'string') sheetConfig = JSON.parse(sheetConfig);

    // 1. Scan Student Reg No
    let regno = '';
    if (regConfig && regConfig.enabled) {
      const colSpacing = regConfig.width / (regConfig.columns - 1 || 1);
      const rowSpacing = regConfig.height / (regConfig.rows - 1 || 1);
      const cols = [];

      for (let col = 0; col < regConfig.columns; col++) {
        const colBubbles = [];
        const x = regConfig.x + col * colSpacing;
        for (let row = 0; row < regConfig.rows; row++) {
          const y = regConfig.y + row * rowSpacing;
          const label = regConfig.rows === 9 ? (row + 1).toString() : row.toString();
          colBubbles.push({
            label: label,
            x: Math.round(x),
            y: Math.round(y),
            r: regConfig.bubbleRadius
          });
        }
        cols.push(colBubbles);
      }

      const scanResult = scanRegistrationGrid(globalImgData, cols, 150);
      regno = scanResult.value;
    }

    // 2. Scan Sheet Number (Conditional on OMR bubble mode)
    let sheetNo = '';
    if (sheetConfig && sheetConfig.enabled && (sheetConfig.mode === 'bubble_grid' || !sheetConfig.mode)) {
      const colSpacing = sheetConfig.width / (sheetConfig.columns - 1 || 1);
      const rowSpacing = sheetConfig.height / (sheetConfig.rows - 1 || 1);
      const cols = [];

      for (let col = 0; col < sheetConfig.columns; col++) {
        const colBubbles = [];
        const x = sheetConfig.x + col * colSpacing;
        for (let row = 0; row < sheetConfig.rows; row++) {
          const y = sheetConfig.y + row * rowSpacing;
          const label = sheetConfig.rows === 9 ? (row + 1).toString() : row.toString();
          colBubbles.push({
            label: label,
            x: Math.round(x),
            y: Math.round(y),
            r: sheetConfig.bubbleRadius
          });
        }
        cols.push(colBubbles);
      }

      const scanResult = scanRegistrationGrid(globalImgData, cols, 150);
      sheetNo = scanResult.value;
    }

    // 3. Scan Questions
    const responsesMap = {};
    qConfig.forEach(block => {
      // Re-calculate bubbles coordinates
      const bubbles = block.bubbles;
      
      // Group bubbles by question number
      const qGroups = {};
      bubbles.forEach(b => {
        if (!qGroups[b.qNum]) qGroups[b.qNum] = [];
        qGroups[b.qNum].push(b);
      });

      Object.keys(qGroups).forEach(qNum => {
        const qBubbles = qGroups[qNum];
        const scanResult = scanQuestionRow(globalImgData, qBubbles, 150);
        responsesMap[parseInt(qNum)] = {
          question_number: parseInt(qNum),
          selected_option: scanResult.selected,
          ratios: scanResult.ratios
        };
      });
    });

    const responses = Object.values(responsesMap).sort((a, b) => a.question_number - b.question_number);

    return {
      student_regno: regno,
      sheet_number: sheetNo,
      responses: responses
    };
  };

  // Run OMR processor loop
  const startProcessing = async (mode) => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setScanMode(mode);
    setProcessingIndex(0);
  };

  useEffect(() => {
    if (!isProcessing || processingIndex === null) return;
    if (processingIndex >= files.length) {
      setIsProcessing(false);
      setProcessingIndex(null);
      if (onEvaluationComplete) onEvaluationComplete();
      return;
    }

    const processItem = async () => {
      const idx = processingIndex;
      const item = files[idx];

      if (item.status === 'completed' || item.status === 'failed') {
        setProcessingIndex(idx + 1);
        return;
      }

      // Update item status
      updateFileItem(idx, { status: 'scanning' });

      try {
        // Step 1: Upload raw image
        let sheetId = item.scannedSheetId;
        if (!sheetId) {
          const uploadRes = await uploadRawScan(item);
          sheetId = uploadRes.scanned_sheet_id;
          updateFileItem(idx, { scannedSheetId: sheetId });
        }

        // Step 2: Auto anchor detection & warp
        let alignedBlob = item.alignedBlob;
        let scanResults = item.results;
        
        if (!alignedBlob) {
          // Load image on temporary canvas
          const img = await loadImage(URL.createObjectURL(item.file));
          const canvas = rawCanvasRef.current;
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);

          // Detect anchors using template expectations
          const detected = await detectAnchors(canvas, selectedTemplate);
          
          if (!detected.autoDetected) {
            // Auto detection failed, require manual paper alignment
            updateFileItem(idx, { status: 'aligning' });
            setIsProcessing(false);
            setAligningIndex(idx);
            return;
          }

          // Warp image
          const warpedCanvas = warpedCanvasRef.current;
          warpedCanvas.width = selectedTemplate.width;
          warpedCanvas.height = selectedTemplate.height;

          let templateAnchors = selectedTemplate.anchors_json;
          if (typeof templateAnchors === 'string') templateAnchors = JSON.parse(templateAnchors);

          await warpPerspective(canvas, warpedCanvas, detected, {
            width: selectedTemplate.width,
            height: selectedTemplate.height,
            anchors: templateAnchors
          });

          // Convert to blob and dataUrl
          alignedBlob = await getCanvasBlob(warpedCanvas);
          const alignedDataUrl = warpedCanvas.toDataURL('image/jpeg', 0.9);
          
          updateFileItem(idx, { 
            alignedBlob, 
            alignedDataUrl 
          });

          // Run scan algorithm on the warped canvas
          scanResults = processAlignedOMR(warpedCanvas, selectedTemplate);
        } else {
          // Already aligned, parse from dataUrl or canvas
          const img = await loadImage(item.alignedDataUrl);
          const canvas = warpedCanvasRef.current;
          canvas.width = selectedTemplate.width;
          canvas.height = selectedTemplate.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          
          scanResults = processAlignedOMR(canvas, selectedTemplate);
        }

        // Apply Sheet Number Mode Overrides
        let sheetConfig = selectedTemplate.sheetno_config;
        if (typeof sheetConfig === 'string') sheetConfig = JSON.parse(sheetConfig);
        
        if (sheetConfig && sheetConfig.enabled) {
          if (sheetConfig.mode === 'file_name') {
            scanResults.sheet_number = item.file.name.replace(/\.[^/.]+$/, "");
          } else if (sheetConfig.mode === 'auto_increment') {
            const startVal = parseInt(sheetConfig.startNumber) || 1001;
            scanResults.sheet_number = (startVal + idx).toString();
          } else if (sheetConfig.mode === 'manual_entry') {
            scanResults.sheet_number = sheetConfig.omr_id || '';
          } else if (sheetConfig.mode === 'barcode') {
            let barcodeVal = '';
            if (typeof window.BarcodeDetector !== 'undefined') {
              try {
                const formats = ['code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code'];
                const detector = new window.BarcodeDetector({ formats });

                // Crop the barcode sub-region from the warped canvas
                const barcodeCanvas = document.createElement('canvas');
                const cropX = Math.max(0, parseInt(sheetConfig.x) || 0);
                const cropY = Math.max(0, parseInt(sheetConfig.y) || 0);
                const cropW = Math.min(warpedCanvasRef.current.width - cropX, parseInt(sheetConfig.width) || 100);
                const cropH = Math.min(warpedCanvasRef.current.height - cropY, parseInt(sheetConfig.height) || 50);

                barcodeCanvas.width = cropW;
                barcodeCanvas.height = cropH;
                const barcodeCtx = barcodeCanvas.getContext('2d');
                barcodeCtx.drawImage(
                  warpedCanvasRef.current,
                  cropX, cropY, cropW, cropH,
                  0, 0, cropW, cropH
                );

                const detected = await detector.detect(barcodeCanvas);
                if (detected && detected.length > 0) {
                  barcodeVal = detected[0].rawValue;
                }
              } catch (err) {
                console.error("Barcode detection failed", err);
              }
            }
            scanResults.sheet_number = barcodeVal || '?';
          }
        }

        // Check if registration number or sheet number contains unknown fills or requires review in Scan All mode
        const isConflict = scanResults.student_regno.includes('?') || 
                           scanResults.sheet_number.includes('?') ||
                           (sheetConfig && sheetConfig.enabled && sheetConfig.mode === 'manual_entry' && !scanResults.sheet_number) ||
                           scanResults.responses.some(r => r.selected_option === 'MULT');

        if (scanMode === 'manual' || isConflict) {
          // Stop queue and open manual review panel
          updateFileItem(idx, { 
            status: 'review',
            results: scanResults,
            studentRegno: scanResults.student_regno.replace(/\?/g, ''),
            sheetNumber: scanResults.sheet_number.replace(/\?/g, '')
          });
          setIsProcessing(false);
          openReviewPanel(idx, scanResults);
          return;
        }

        // Save automatically in Scan All mode
        await saveResponsesToBackend(sheetId, scanResults.student_regno, scanResults.sheet_number, scanResults.responses, alignedBlob);
        updateFileItem(idx, { 
          status: 'completed',
          studentRegno: scanResults.student_regno,
          sheetNumber: scanResults.sheet_number,
          results: scanResults
        });

        // Continue queue
        setProcessingIndex(idx + 1);

      } catch (err) {
        console.error(err);
        updateFileItem(idx, { status: 'failed', error: err.message });
        setProcessingIndex(idx + 1);
      }
    };

    processItem();
  }, [isProcessing, processingIndex]);

  // Save scan details to SQL via PHP
  const saveResponsesToBackend = async (sheetId, regno, sheetNo, responses, alignedBlob) => {
    const formData = new FormData();
    formData.append('scanned_sheet_id', sheetId);
    formData.append('student_regno', regno);
    formData.append('omr_id', sheetNo);
    formData.append('sheet_number', sheetNo);
    formData.append('status', 'approved');
    formData.append('responses', JSON.stringify(responses));
    
    if (alignedBlob) {
      formData.append('aligned_image', alignedBlob, 'aligned.jpg');
    }

    const data = await api.saveResponse(formData);
    if (!data.success) {
      throw new Error(data.message || "Failed to save response data.");
    }
  };

  // Helper utils
  const updateFileItem = (idx, fields) => {
    setFiles(prev => prev.map((item, i) => i === idx ? { ...item, ...fields } : item));
  };

  const loadImage = (src) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  const getCanvasBlob = (canvas) => {
    return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
  };

  // Manual alignment callbacks
  const handleAlignedCallback = (aligned) => {
    const idx = aligningIndex;
    updateFileItem(idx, {
      alignedBlob: aligned.blob,
      alignedDataUrl: aligned.dataUrl,
      status: 'scanning'
    });
    setAligningIndex(null);
    // Resume queue
    setIsProcessing(true);
  };

  // Manual Review Panel management
  const openReviewPanel = (idx, scanResults) => {
    setReviewingIndex(idx);
    setReviewData({
      studentRegno: scanResults.student_regno.replace(/\?/g, ''),
      sheetNumber: scanResults.sheet_number.replace(/\?/g, ''),
      responses: [...scanResults.responses]
    });
  };

  // Draw template overlays on aligned review image canvas
  useEffect(() => {
    if (reviewingIndex === null || !files[reviewingIndex] || !selectedTemplate || !reviewCanvasRef.current) return;
    
    const canvas = reviewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      // Draw template overlays for visual alignment review
      // 1. Draw Registration Grid (Cyan)
      let regConfig = selectedTemplate.regno_config;
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
      
      // 2. Draw Sheet No Grid (Yellow)
      let sheetConfig = selectedTemplate.sheetno_config;
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
      
      // 3. Draw Question Bubbles (Green)
      let qConfig = selectedTemplate.questions_config;
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
    img.src = files[reviewingIndex].alignedDataUrl;
  }, [reviewingIndex, selectedTemplate, files]);

  const updateReviewResponse = (qIndex, selectedVal) => {
    setReviewData(prev => {
      const updated = [...prev.responses];
      updated[qIndex] = { ...updated[qIndex], selected_option: selectedVal };
      return { ...prev, responses: updated };
    });
  };

  const saveReviewApproval = async () => {
    setLoadingReviewSave(true);
    const idx = reviewingIndex;
    const item = files[idx];

    try {
      await saveResponsesToBackend(
        item.scannedSheetId,
        reviewData.studentRegno,
        reviewData.sheetNumber,
        reviewData.responses,
        item.alignedBlob
      );

      updateFileItem(idx, {
        status: 'completed',
        studentRegno: reviewData.studentRegno,
        sheetNumber: reviewData.sheetNumber,
        results: {
          ...item.results,
          student_regno: reviewData.studentRegno,
          sheet_number: reviewData.sheetNumber,
          responses: reviewData.responses
        }
      });

      setReviewingIndex(null);
      setReviewData(null);
      
      // Resume the processing queue
      setProcessingIndex(idx + 1);
      setIsProcessing(true);
    } catch (err) {
      alert("Error saving approved results: " + err.message);
    } finally {
      setLoadingReviewSave(false);
    }
  };

  const [loadingReviewSave, setLoadingReviewSave] = useState(false);
  const [bubbleCropCache, setBubbleCropCache] = useState({});

  // Render cropped bubbles inline inside the table row
  const renderCroppedBubbleRow = (qData, qIndex) => {
    // Find the bubble configuration in template questions_config
    if (!selectedTemplate) return null;
    let qConfig = selectedTemplate.questions_config;
    if (typeof qConfig === 'string') qConfig = JSON.parse(qConfig);
    
    // Find matching bubble config coordinates
    let bubbleCoords = null;
    for (let block of qConfig) {
      bubbleCoords = block.bubbles.filter(b => b.qNum === qData.question_number);
      if (bubbleCoords.length > 0) break;
    }

    if (!bubbleCoords || bubbleCoords.length === 0) return null;

    // Use a small helper canvas render
    return (
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {bubbleCoords.map((coord, cIdx) => {
          const isSelected = qData.selected_option === coord.label;
          return (
            <div 
              key={cIdx} 
              onClick={() => updateReviewResponse(qIndex, coord.label)}
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                cursor: 'pointer',
                opacity: isSelected ? 1 : 0.6,
                transform: isSelected ? 'scale(1.15)' : 'none',
                transition: 'var(--transition)'
              }}
            >
              <div 
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  border: isSelected ? '2px solid var(--accent-secondary)' : '1px solid var(--border-color)',
                  background: isSelected ? 'rgba(6, 182, 212, 0.2)' : 'var(--bg-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: isSelected ? 'var(--accent-secondary)' : 'var(--text-secondary)'
                }}
              >
                {coord.label}
              </div>
            </div>
          );
        })}
        <button 
          onClick={() => updateReviewResponse(qIndex, 'BLANK')}
          style={{
            padding: '2px 6px',
            fontSize: '10px',
            background: qData.selected_option === 'BLANK' ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
            border: '1px solid var(--border-color)',
            color: qData.selected_option === 'BLANK' ? 'var(--danger)' : 'var(--text-muted)',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Clear
        </button>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* 1. Template Select & Upload Section */}
      {aligningIndex === null && reviewingIndex === null && (
        <div className="grid-2">
          
          {/* Controls Card */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>OMR Scanning Console</h2>
            
            <div className="form-group">
              <label className="form-label">Select Scanning Template</label>
              <select 
                className="form-input" 
                value={selectedTemplateId} 
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                disabled={isProcessing}
              >
                <option value="">-- Choose Template --</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            {selectedTemplate && (
              <div 
                style={{
                  border: '2px dashed var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '2rem 1.5rem',
                  textAlign: 'center',
                  cursor: isProcessing ? 'not-allowed' : 'pointer'
                }}
                onClick={() => !isProcessing && document.getElementById('scan-uploader').click()}
              >
                <input 
                  type="file" 
                  id="scan-uploader" 
                  style={{ display: 'none' }} 
                  multiple 
                  accept="image/*" 
                  onChange={handleFileChange}
                  disabled={isProcessing}
                />
                <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>Upload Student Scan Sheets</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Select multiple files to scan in batch</p>
              </div>
            )}

            {files.length > 0 && !isProcessing && (
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button 
                  className="btn btn-primary" 
                  style={{ flex: 1 }}
                  onClick={() => startProcessing('all')}
                >
                  <Play size={16} /> Scan All (Auto)
                </button>
                <button 
                  className="btn btn-secondary" 
                  style={{ flex: 1 }}
                  onClick={() => startProcessing('manual')}
                >
                  <CheckSquare size={16} /> Manual Approval
                </button>
              </div>
            )}
          </div>

          {/* Queue List Card */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '350px', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Scans Queue ({files.length} sheets)</h3>
            
            {files.length === 0 ? (
              <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                No sheets uploaded yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {files.map((item, idx) => (
                  <div 
                    key={idx} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'between',
                      background: 'rgba(255,255,255,0.02)',
                      padding: '0.75rem',
                      borderRadius: '6px',
                      border: idx === processingIndex ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', flex: 1 }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '220px' }}>{item.name}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {item.status === 'completed' && `RegNo: ${item.studentRegno} | Sheet#: ${item.sheetNumber}`}
                        {item.status === 'failed' && `Error: ${item.error}`}
                        {item.status === 'pending' && 'Queued'}
                        {item.status === 'scanning' && 'Scanning...'}
                        {item.status === 'aligning' && 'Awaiting alignment adjustment'}
                        {item.status === 'review' && 'Awaiting manual approval'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {item.status === 'completed' && <span className="badge badge-success">Success</span>}
                      {item.status === 'failed' && <span className="badge badge-danger">Failed</span>}
                      {item.status === 'aligning' && <span className="badge badge-warning">Adjust Page</span>}
                      {item.status === 'review' && <span className="badge badge-primary">Review</span>}
                      
                      {(item.status === 'aligning' || item.status === 'review' || item.status === 'completed' || item.status === 'failed') && (
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '4px 8px', fontSize: '0.75rem' }} 
                          onClick={() => setAligningIndex(idx)}
                        >
                          Align
                        </button>
                      )}

                      {item.status === 'review' && (
                        <button 
                          className="btn btn-primary" 
                          style={{ padding: '4px 8px', fontSize: '0.75rem' }} 
                          onClick={() => openReviewPanel(idx, item.results)}
                        >
                          Review
                        </button>
                      )}

                      {!isProcessing && (
                        <button 
                          style={{ background: 'transparent', border: 0, color: 'var(--text-muted)', cursor: 'pointer' }}
                          onClick={() => removeFile(idx)}
                        >
                          <Trash size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Paper Alignment View Override */}
      {aligningIndex !== null && (
        <div className="glass-card">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Adjust Paper Registration: {files[aligningIndex].name}</h2>
          <OMRImageAdjuster 
            file={files[aligningIndex].file} 
            template={selectedTemplate} 
            onAligned={handleAlignedCallback} 
          />
        </div>
      )}

      {/* 3. Manual Approval Side Panel Overlay */}
      {reviewingIndex !== null && reviewData && (
        <div className="glass-card" style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '2rem' }}>
          
          {/* Left: Aligned Scan Sheet View */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderRight: '1px solid var(--border-color)', paddingRight: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Sheet Visual Reference (Aligned Overlay)</h3>
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden', background: '#090b11', padding: '0.5rem' }}>
              <canvas 
                ref={reviewCanvasRef}
                style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '4px' }} 
              />
            </div>
          </div>

          {/* Right: Manual Verification and Fills Editor */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Question-Wise Approval</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Verify detected options and enter student info.</p>
              </div>
              
              <button 
                className="btn btn-success"
                onClick={saveReviewApproval}
                disabled={loadingReviewSave}
              >
                <CheckCircle size={18} /> Approve & Save
              </button>
            </div>

            {/* Student Registration + Sheet No Forms */}
            <div className="grid-2" style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Student Regno</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={reviewData.studentRegno} 
                  onChange={(e) => setReviewData({ ...reviewData, studentRegno: e.target.value.toUpperCase() })} 
                  placeholder="Enter Student Reg No"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">OMR ID</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={reviewData.sheetNumber} 
                  onChange={(e) => setReviewData({ ...reviewData, sheetNumber: e.target.value })} 
                  placeholder="Enter OMR ID"
                />
              </div>
            </div>

            {/* Questions List with inline bubble options */}
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '450px', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th style={{ width: '80px' }}>Qn#</th>
                    <th>Select Filled Bubble (Interactive Crop Row)</th>
                    <th style={{ width: '120px' }}>Detected</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewData.responses.map((qData, qIdx) => (
                    <tr key={qData.question_number} style={{ background: qData.selected_option === 'BLANK' || qData.selected_option === 'MULT' ? 'rgba(239, 68, 68, 0.05)' : 'transparent' }}>
                      <td style={{ fontWeight: 600 }}>Q{qData.question_number}</td>
                      <td>{renderCroppedBubbleRow(qData, qIdx)}</td>
                      <td>
                        <span className={`badge ${qData.selected_option === 'BLANK' ? 'badge-danger' : qData.selected_option === 'MULT' ? 'badge-warning' : 'badge-success'}`}>
                          {qData.selected_option}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};

export default OMRScanConsole;
