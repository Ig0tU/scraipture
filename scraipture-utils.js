// Utility functions for data extraction, QR code generation and ZIP packaging

// Generate domain-specific words based on domain type
function generateDomainWords(domain) {
  const commonWords = ['the', 'and', 'to', 'of', 'in', 'for', 'our', 'we', 'with', 'you', 'your', 'on', 'is', 'are', 'this', 'that'];
  
  // Domain-specific word sets
  const domainWords = {
    'example': ['sample', 'test', 'demo', 'example', 'showcase', 'demonstration', 'prototype', 'model'],
    'test': ['testing', 'validation', 'verify', 'check', 'analyze', 'evaluate', 'assessment', 'examination'],
    'demo': ['demonstration', 'preview', 'trial', 'sample', 'showcase', 'exhibit', 'presentation', 'display'],
    'blog': ['article', 'post', 'content', 'author', 'read', 'writing', 'story', 'update'],
    'shop': ['product', 'price', 'buy', 'cart', 'store', 'purchase', 'shopping', 'offer'],
    'news': ['article', 'latest', 'breaking', 'report', 'update', 'coverage', 'headline', 'story'],
    'tech': ['technology', 'software', 'digital', 'innovation', 'solution', 'development', 'system', 'platform']
  };
  
  // Find matching domain words or use defaults
  let words = [...commonWords];
  
  // Check each domain type and add relevant words
  for (const [key, wordList] of Object.entries(domainWords)) {
    if (domain.toLowerCase().includes(key)) {
      words = [...words, ...wordList];
    }
  }
  
  // Add some general business/website words if no specific match
  if (words.length === commonWords.length) {
    words = [...words, 'welcome', 'service', 'about', 'contact', 'information', 'quality', 'professional', 'experience'];
  }
  
  return words;
}

// Extract data from URL and return structured result
async function extractDataFromUrl(url) {
  try {
    const response = await fetch(url);
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    return {
      url: url,
      title: doc.title,
      metadata: extractMetadata(doc),
      content: extractContent(doc),
      links: extractLinks(doc),
      images: await extractImages(doc),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    throw new Error(`Failed to extract data: ${error.message}`);
  }
}

// Extract metadata from document
function extractMetadata(doc) {
  const metadata = {};
  
  // Get meta tags
  doc.querySelectorAll('meta').forEach(meta => {
    const name = meta.getAttribute('name') || meta.getAttribute('property');
    const content = meta.getAttribute('content');
    if (name && content) {
      metadata[name] = content;
    }
  });

  return metadata;
}

// Extract main content
function extractContent(doc) {
  const content = {
    text: [],
    headings: [],
    paragraphs: []
  };

  // Extract text content
  doc.querySelectorAll('p, h1, h2, h3, h4, h5, h6').forEach(element => {
    const text = element.textContent.trim();
    if (text) {
      if (element.tagName.toLowerCase().startsWith('h')) {
        content.headings.push({
          level: parseInt(element.tagName[1]),
          text: text
        });
      } else {
        content.paragraphs.push(text);
      }
      content.text.push(text);
    }
  });

  return content;
}

// Extract links
function extractLinks(doc) {
  const links = [];
  doc.querySelectorAll('a').forEach(a => {
    const href = a.href;
    if (href && !href.startsWith('javascript:')) {
      links.push({
        url: href,
        text: a.textContent.trim(),
        title: a.title || null
      });
    }
  });
  return links;
}

// Extract and encode images
async function extractImages(doc) {
  const images = [];
  const imageElements = doc.querySelectorAll('img');
  
  for (const img of imageElements) {
    try {
      const src = img.src;
      if (src && !src.startsWith('data:')) {
        const response = await fetch(src);
        const blob = await response.blob();
        const base64 = await blobToBase64(blob);
        
        images.push({
          src: src,
          alt: img.alt || '',
          base64: base64,
          type: blob.type
        });
      }
    } catch (error) {
      console.warn(`Failed to process image ${img.src}: ${error.message}`);
    }
  }
  
  return images;
}

// Convert blob to base64
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = () => reject(new Error('Failed to convert blob to base64'));
    reader.readAsDataURL(blob);
  });
}

// Generate QR code for data
async function generateQR(data, options = {}) {
  const qr = new QRCode(options);
  return await qr.toDataURL(JSON.stringify(data));
}

// Create downloadable ZIP with JSON and QR code
async function createDownloadableZip(data, qrCode) {
  const zip = new JSZip();
  
  // Add JSON data
  zip.file('data.json', JSON.stringify(data, null, 2));
  
  // Add QR code if available
  if (qrCode) {
    zip.file('qr-code.png', qrCode.split(',')[1], {base64: true});
  }
  
  // Generate ZIP file
  const content = await zip.generateAsync({type: 'blob'});
  return content;
}

// Download helper
function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

// Generate heading text
function generateHeadingText(domain, minWords, maxWords) {
  const words = generateDomainWords(domain);
  const length = minWords + Math.floor(Math.random() * (maxWords - minWords + 1));
  return generateSentence(words, length, length);
}

// Generate paragraph text
function generateParagraphText(words, minWords, maxWords) {
  const sentences = 1 + Math.floor(Math.random() * 3);
  return Array(sentences).fill(0)
    .map(() => generateSentence(words, minWords, maxWords))
    .join(' ');
}

// Generate a sentence
function generateSentence(words, minWords, maxWords) {
  const length = minWords + Math.floor(Math.random() * (maxWords - minWords + 1));
  const sentence = Array(length).fill(0)
    .map(() => words[Math.floor(Math.random() * words.length)])
    .join(' ');
  return sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.';
}