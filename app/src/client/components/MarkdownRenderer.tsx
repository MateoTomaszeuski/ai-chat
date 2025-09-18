import React from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  const renderMarkdown = (text: string): string => {
    // Configure marked options for better rendering
    marked.setOptions({
      breaks: true, // Convert line breaks to <br>
      gfm: true, // GitHub Flavored Markdown
    });

    // Parse markdown to HTML synchronously
    const htmlContent = marked.parse(text) as string;
    
    // Sanitize the HTML to prevent XSS attacks
    // Allow basic HTML tags that are safe for markdown content
    const sanitizedHtml = DOMPurify.sanitize(htmlContent, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'u', 'code', 'pre', 'blockquote',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li',
        'a', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'hr', 'del', 'ins'
      ],
      ALLOWED_ATTR: ['href', 'title', 'alt', 'class'],
      ALLOW_DATA_ATTR: false,
    });
    
    return sanitizedHtml;
  };

  return (
    <div
      className={`markdown-content ${className}`}
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
};