import React, { useState } from 'react';

// ── Scanner UI ─────────────────────────────────────────────────────────────
export default function Scanner({ onScanComplete, onCancel }) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsScanning(true);
    setError(null);

    try {
      // Step 1: Read the file as Base64 for the AI
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Data = reader.result.split(',')[1];
        
        // Step 2: Invoke the Tauri OCR command
        // This will send the image to Gemini 1.5 Pro's Vision model
        const { invoke } = await import('@tauri-apps/api/core');
        const result = await invoke('process_ocr_image', { base64Data });
        
        onScanComplete(result);
      };
    } catch (err) {
      setError(`// SCAN FAILED: ${err}`);
      setIsScanning(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ width: '480px', border: '1px solid var(--lime)', boxShadow: '6px 6px 0px var(--lime)' }}>
        <div className="modal-title" style={{ color: 'var(--lime)' }}>// ENCHANTED SCANNER</div>
        
        <div className="link-index-empty" style={{ padding: '0 0 20px', textAlign: 'left' }}>
          Upload a photo of your physical notebook.<br />
          Gemini 1.5 Pro will transcribe and link it.
        </div>

        {error && <div className="ai-message-text" style={{ color: 'var(--accent)', marginBottom: '16px' }}>{error}</div>}

        <div style={{ position: 'relative', height: '120px', border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isScanning ? (
            <div className="modal-input loading" style={{ textAlign: 'center', border: 'none', background: 'transparent' }}>
              DECODING OPTICAL DATA...
            </div>
          ) : (
            <>
              <input 
                type="file" 
                accept="image/*" 
                style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} 
                onChange={handleFileSelect}
              />
              <span className="sidebar-title" style={{ color: 'var(--text-main)' }}>[ DRAG OR CLICK TO SCAN ]</span>
            </>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onCancel}>CANCEL</button>
        </div>
      </div>
    </div>
  );
}
