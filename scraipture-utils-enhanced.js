// Enhanced utility functions for Scraipture Pro
(function(window) {
    'use strict';

    // Web Scraping Core Functions
    class ScraiptureCore {
        constructor() {
            this.cache = new Map();
        }

        async initialize(url) {
            console.time('initialization');
            try {
                // If it's the current page, use document directly
                if (url === window.location.href) {
                    console.timeEnd('initialization');
                    return document;
                }

                // Otherwise fetch and parse the page
                const response = await fetch(url);
                const html = await response.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                console.timeEnd('initialization');
                return doc;
            } catch (error) {
                console.error('Initialization failed:', error);
                throw new Error(`Failed to initialize: ${error.message}`);
            }
        }

        async extractAllContent(doc) {
            try {
                const content = {
                    metadata: this.extractMetadata(doc),
                    content: {
                        navigation: this.extractNavigation(doc),
                        main: this.extractMainContent(doc),
                        footer: this.extractFooter(doc)
                    },
                    links: this.extractLinks(doc),
                    images: await this.extractImages(doc),
                    structure: this.analyzeStructure(doc)
                };

                return this.cleanContent(content);
            } catch (error) {
                console.error('Content extraction failed:', error);
                throw new Error(`Failed to extract content: ${error.message}`);
            }
        }

        extractMetadata(doc) {
            return {
                title: doc.title,
                meta: Array.from(doc.querySelectorAll('meta')).map(meta => ({
                    name: meta.getAttribute('name') || meta.getAttribute('property'),
                    content: meta.getAttribute('content')
                })).filter(meta => meta.name && meta.content),
                scripts: Array.from(doc.querySelectorAll('script[src]')).map(script => script.src),
                styles: Array.from(doc.querySelectorAll('link[rel="stylesheet"]')).map(link => link.href)
            };
        }

        extractNavigation(doc) {
            const nav = doc.querySelector('nav');
            if (!nav) return null;

            return {
                items: Array.from(nav.querySelectorAll('a, button')).map(item => ({
                    text: item.textContent.trim(),
                    type: item.tagName.toLowerCase(),
                    href: item.tagName.toLowerCase() === 'a' ? item.href : null
                }))
            };
        }

        extractMainContent(doc) {
            const main = doc.querySelector('main');
            if (!main) return null;

            return {
                title: main.querySelector('h1')?.textContent.trim(),
                subtitle: main.querySelector('h1 + p')?.textContent.trim(),
                sections: Array.from(main.querySelectorAll('section')).map(section => ({
                    title: section.querySelector('h2,h3')?.textContent.trim(),
                    content: Array.from(section.querySelectorAll('p')).map(p => p.textContent.trim())
                }))
            };
        }

        extractFooter(doc) {
            const footer = doc.querySelector('footer');
            if (!footer) return null;

            return {
                text: footer.textContent.trim(),
                links: Array.from(footer.querySelectorAll('a')).map(a => ({
                    text: a.textContent.trim(),
                    href: a.href
                }))
            };
        }

        extractLinks(doc) {
            return Array.from(doc.querySelectorAll('a')).map(a => ({
                text: a.textContent.trim(),
                href: a.href,
                title: a.title,
                location: this.getElementLocation(a)
            }));
        }

        async extractImages(doc) {
            return Array.from(doc.querySelectorAll('img')).map(img => ({
                src: img.src,
                alt: img.alt,
                title: img.title,
                dimensions: {
                    width: img.naturalWidth,
                    height: img.naturalHeight
                },
                location: this.getElementLocation(img)
            }));
        }

        analyzeStructure(doc) {
            return {
                elements: this.countElements(doc),
                depth: this.getMaxDepth(doc.body),
                headings: this.analyzeHeadings(doc)
            };
        }

        countElements(doc) {
            const elements = {};
            doc.querySelectorAll('*').forEach(el => {
                const tag = el.tagName.toLowerCase();
                elements[tag] = (elements[tag] || 0) + 1;
            });
            return elements;
        }

        getMaxDepth(element, currentDepth = 0) {
            let maxDepth = currentDepth;
            Array.from(element.children).forEach(child => {
                maxDepth = Math.max(maxDepth, this.getMaxDepth(child, currentDepth + 1));
            });
            return maxDepth;
        }

        analyzeHeadings(doc) {
            return Array.from(doc.querySelectorAll('h1,h2,h3,h4,h5,h6')).map(h => ({
                level: parseInt(h.tagName[1]),
                text: h.textContent.trim(),
                location: this.getElementLocation(h)
            }));
        }

        getElementLocation(element) {
            const rect = element.getBoundingClientRect();
            return {
                x: Math.round(rect.x),
                y: Math.round(rect.y),
                width: Math.round(rect.width),
                height: Math.round(rect.height)
            };
        }

        cleanContent(content) {
            return JSON.parse(JSON.stringify(content, (key, value) => {
                if (value === null || value === undefined || value === '') return undefined;
                if (Array.isArray(value) && value.length === 0) return undefined;
                if (typeof value === 'object' && Object.keys(value).length === 0) return undefined;
                if (typeof value === 'string') return value.trim();
                return value;
            }));
        }
    }

    // Analytics Functions
    class ScraiptureAnalytics {
        analyzeContent(content) {
            return {
                metadata: {
                    title: content.metadata.title,
                    description: content.metadata.meta.find(m => m.name === 'description')?.content
                },
                statistics: {
                    links: this.analyzeLinkStats(content.links),
                    images: this.analyzeImageStats(content.images),
                    structure: content.structure
                }
            };
        }

        analyzeLinkStats(links) {
            if (!links || !Array.isArray(links)) return { total: 0 };

            const internal = links.filter(l => l.href.includes(window.location.hostname));
            const external = links.filter(l => !l.href.includes(window.location.hostname));

            return {
                total: links.length,
                internal: internal.length,
                external: external.length,
                distribution: {
                    internal: links.length ? (internal.length / links.length) * 100 : 0,
                    external: links.length ? (external.length / links.length) * 100 : 0
                }
            };
        }

        analyzeImageStats(images) {
            if (!images || !Array.isArray(images)) return { total: 0 };

            return {
                total: images.length,
                withAlt: images.filter(img => img.alt).length,
                averageDimensions: images.length ? {
                    width: Math.round(images.reduce((sum, img) => sum + (img.dimensions?.width || 0), 0) / images.length),
                    height: Math.round(images.reduce((sum, img) => sum + (img.dimensions?.height || 0), 0) / images.length)
                } : null
            };
        }

        generateChartData(analysis) {
            return {
                linkDistribution: {
                    labels: ['Internal', 'External'],
                    data: [
                        analysis.statistics.links.internal || 0,
                        analysis.statistics.links.external || 0
                    ]
                },
                elementDistribution: {
                    labels: Object.keys(analysis.statistics.structure.elements || {}),
                    data: Object.values(analysis.statistics.structure.elements || {})
                }
            };
        }

        createVisualizations(data, container) {
            // Implementation depends on Chart.js
            console.log('Visualization data ready:', data);
        }
    }

    // Export Functions
    class ScraiptureExport {
        async exportData(content, format) {
            switch (format) {
                case 'json':
                    return JSON.stringify(content, null, 2);
                case 'csv':
                    return this.convertToCSV(content);
                default:
                    throw new Error(`Unsupported format: ${format}`);
            }
        }

        convertToCSV(content) {
            const rows = [];
            
            // Add metadata
            rows.push(['Title', content.metadata.title]);
            rows.push(['URL', window.location.href]);
            rows.push(['Timestamp', new Date().toISOString()]);
            rows.push([]);

            // Add content sections
            if (content.content.main) {
                rows.push(['Main Content']);
                rows.push(['Title', content.content.main.title]);
                rows.push(['Subtitle', content.content.main.subtitle]);
                content.content.main.sections.forEach(section => {
                    rows.push([]);
                    rows.push(['Section', section.title]);
                    section.content.forEach(text => {
                        rows.push(['Content', text]);
                    });
                });
            }

            return rows.map(row => row.join(',')).join('\n');
        }
    }

    // Initialize and expose the API
    window.scraipture = {
        core: new ScraiptureCore(),
        analytics: new ScraiptureAnalytics(),
        export: new ScraiptureExport()
    };

})(window);
