import React, { useRef, useState } from 'react';
import { ToolMode, BrickType } from '../types';
import { PALETTE, BRICK_TYPES } from '../constants';

interface ControlsProps {
  toolMode: ToolMode;
  setToolMode: (mode: ToolMode) => void;
  selectedColor: string;
  setSelectedColor: (color: string) => void;
  onGenerate: (file: File) => void;
  isGenerating: boolean;
  clearBricks: () => void;
  selectedBrickType: BrickType;
  setSelectedBrickType: (type: BrickType) => void;
  onReplay: () => void;
  hasBricks: boolean;
}

const Controls: React.FC<ControlsProps> = ({
  toolMode,
  setToolMode,
  selectedColor,
  setSelectedColor,
  onGenerate,
  isGenerating,
  clearBricks,
  selectedBrickType,
  setSelectedBrickType,
  onReplay,
  hasBricks
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onGenerate(e.target.files[0]);
    }
  };

  return (
    <>
      {/* Sidebar Toggle */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className={`fixed top-1/2 left-0 transform -translate-y-1/2 z-30 bg-white p-2 rounded-r-xl shadow-md transition-all ${isSidebarOpen ? 'left-64' : 'left-0'}`}
        title={isSidebarOpen ? "Close Menu" : "Open Menu"}
      >
         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {isSidebarOpen ? (
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            ) : (
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            )}
         </svg>
      </button>

      {/* Left Sidebar - Brick Types */}
      <div className={`fixed top-0 left-0 h-full bg-white/95 backdrop-blur-md shadow-2xl w-64 z-20 transform transition-transform duration-300 ease-in-out flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-gray-100">
           <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
             <span>🧱</span> Blocks
           </h2>
           <p className="text-xs text-gray-400 mt-1">Select size & shape</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {BRICK_TYPES.map((type) => (
            <button
              key={type.label}
              onClick={() => setSelectedBrickType(type)}
              className={`w-full p-3 rounded-xl flex items-center justify-between transition-all border-2 ${
                selectedBrickType.label === type.label 
                  ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' 
                  : 'border-transparent hover:bg-gray-50 text-gray-600'
              }`}
            >
              <span className="font-bold">{type.label}</span>
              <div className="flex gap-1">
                 {/* Mini visualizer of the block */}
                 <div 
                    className="bg-gray-300 rounded-sm" 
                    style={{ 
                       width: `${type.sizeX * 8}px`, 
                       height: `${type.sizeZ * 8}px` 
                    }}
                 ></div>
              </div>
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50">
            <div className="text-xs text-gray-500 text-center">
                Press <span className="font-bold text-gray-800 bg-gray-200 px-1 rounded">R</span> to Rotate
            </div>
        </div>
      </div>

      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-10 flex flex-col justify-between p-6 pl-4 md:pl-6">
        
        {/* Header / Top Bar */}
        <div className={`pointer-events-auto flex justify-between items-start transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
          <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border-b-4 border-gray-200 hidden md:block">
            <h1 className="text-3xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
              <span className="text-red-500">Brick</span>
              <span className="text-blue-500">Genius</span>
              <span className="text-yellow-500 text-sm font-normal bg-gray-800 px-2 py-1 rounded-md text-white">AI</span>
            </h1>
          </div>

          <div className="flex gap-2 ml-auto">
             <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*" 
              className="hidden" 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isGenerating}
              className={`bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:scale-105 transition-transform flex items-center gap-2 pointer-events-auto border-b-4 border-indigo-800 active:border-b-0 active:translate-y-1 ${isGenerating ? 'opacity-50 cursor-wait' : ''}`}
            >
               {isGenerating ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
               ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Load Image
                </>
               )}
            </button>

            {/* Replay Button */}
            {hasBricks && (
              <button 
                onClick={onReplay}
                className="bg-green-100 text-green-600 hover:bg-green-200 p-3 rounded-xl font-bold shadow-md pointer-events-auto transition-colors border-b-4 border-green-200 active:border-b-0 active:translate-y-1"
                title="Replay Animation"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            )}

            <button 
              onClick={clearBricks}
              className="bg-red-100 text-red-600 hover:bg-red-200 p-3 rounded-xl font-bold shadow-md pointer-events-auto transition-colors border-b-4 border-red-200 active:border-b-0 active:translate-y-1"
              title="Clear Board"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Bottom / Side Controls */}
        <div className={`pointer-events-auto flex flex-col md:flex-row items-end md:items-center justify-between gap-4 transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
          
          {/* Tool Selector */}
          <div className="bg-white p-2 rounded-2xl shadow-xl flex gap-2 border border-gray-100">
            <button 
              onClick={() => setToolMode('VIEW')}
              className={`p-3 rounded-xl transition-all ${toolMode === 'VIEW' ? 'bg-gray-800 text-white shadow-md' : 'hover:bg-gray-100 text-gray-600'}`}
              title="View Mode"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
            <button 
              onClick={() => setToolMode('BUILD')}
              className={`p-3 rounded-xl transition-all ${toolMode === 'BUILD' ? 'bg-blue-500 text-white shadow-md' : 'hover:bg-blue-50 text-blue-600'}`}
              title="Build Mode"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
            <button 
              onClick={() => setToolMode('DELETE')}
              className={`p-3 rounded-xl transition-all ${toolMode === 'DELETE' ? 'bg-red-500 text-white shadow-md' : 'hover:bg-red-50 text-red-600'}`}
              title="Delete Mode"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Color Palette */}
          {toolMode === 'BUILD' && (
            <div className="bg-white p-3 rounded-2xl shadow-xl flex gap-3 overflow-x-auto max-w-full border border-gray-100">
              {PALETTE.map((color) => (
                <button
                  key={color.name}
                  onClick={() => setSelectedColor(color.value)}
                  className={`w-10 h-10 rounded-full border-2 shadow-sm transition-transform hover:scale-110 ${selectedColor === color.value ? 'border-gray-800 scale-110 ring-2 ring-offset-2 ring-gray-300' : 'border-gray-200'}`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          )}

          {/* Tips */}
          <div className="bg-black/70 text-white p-4 rounded-xl backdrop-blur-sm max-w-xs hidden lg:block">
            <h3 className="font-bold text-sm mb-1 text-yellow-400">How to use</h3>
            <p className="text-xs text-gray-300">
              Upload an image for AI build. Use sidebar to pick block size. <br/> Press 'R' to rotate blocks.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Controls;