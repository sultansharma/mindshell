#!/usr/bin/env node

// Test script to demonstrate download progress functionality
import { downloadTracker } from './dist/utils/downloadProgress.js';

console.log('🧪 Testing Download Progress System');
console.log('=====================================\n');

// Simulate download progress
downloadTracker.on('progress', (progress) => {
  console.log(`📊 Progress Update:`);
  console.log(`   Model: ${progress.model}`);
  console.log(`   Stage: ${progress.stage || 'unknown'}`);
  console.log(`   Progress: ${progress.progress}`);
  console.log(`   Percentage: ${progress.percentage || 'N/A'}%`);
  console.log(`   Complete: ${progress.isComplete}`);
  if (progress.error) {
    console.log(`   Error: ${progress.error}`);
  }
  console.log('');
});

// Simulate a download
async function simulateDownload() {
  console.log('🚀 Starting simulated download...\n');
  
  downloadTracker.startDownload('phi3.5');
  
  // Simulate different stages
  setTimeout(() => {
    downloadTracker.updateProgress('📥 Pulling manifest...', 'downloading', 10);
  }, 1000);
  
  setTimeout(() => {
    downloadTracker.updateProgress('📥 Downloading layers...', 'downloading', 25);
  }, 2000);
  
  setTimeout(() => {
    downloadTracker.updateProgress('📦 Downloaded 150MB / 600MB', 'downloading', 50);
  }, 3000);
  
  setTimeout(() => {
    downloadTracker.updateProgress('🔍 Verifying checksums...', 'verifying', 75);
  }, 4000);
  
  setTimeout(() => {
    downloadTracker.updateProgress('💾 Writing to disk...', 'writing', 90);
  }, 5000);
  
  setTimeout(() => {
    downloadTracker.completeDownload();
    console.log('✅ Download simulation completed!\n');
  }, 6000);
}

simulateDownload(); 